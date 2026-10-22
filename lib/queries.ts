import { supabase } from './supabase';
import { unstable_cache } from 'next/cache';
import type {
  Genre,
  Book,
  SuperCategory,
  DifficultyLevel,
  SortOption,
  FictionFilters,
} from '@/types/database';

function handleError<T>(data: T | null, error: unknown): T {
  if (error) {
    console.error('[Database Error]', error);
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: string }).message)
      : 'Database query failed';
    throw new Error(errorMessage);
  }
  
  return data as T;
}

export const getAllSuperCategories = unstable_cache(
  async (): Promise<SuperCategory[]> => {
    const { data, error } = await supabase
      .from('super_categories')
      .select('*')
      .order('name');
      
    return handleError(data, error) as SuperCategory[];
  },
  ['super_categories'],
  { revalidate: 3600 }
);

export const getAllGenres = unstable_cache(
  async (): Promise<Genre[]> => {
    const { data, error } = await supabase
      .from('genres')
      .select('*, super_categories(*), books(count)')
      .order('sort_order', { ascending: true });
      
    const rawData = handleError(data, error) as { books?: { count?: number }[] | { count?: number } }[];
    
    const populatedGenres = rawData.filter(genre => {
      let bookCount = 0;
      if (Array.isArray(genre.books)) {
        bookCount = genre.books[0]?.count ?? 0;
      } else if (genre.books && typeof genre.books === 'object') {
        bookCount = genre.books.count ?? 0;
      }
      return bookCount > 0;
    });

    return populatedGenres as Genre[];
  },
  ['all_genres_populated'],
  { revalidate: 3600 }
);

export async function getGenresBySuperCategory(superSlug: string): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories!inner(*)')
    .eq('super_categories.slug', superSlug)
    .order('sort_order');
    
  return handleError(data, error) as Genre[];
}

export async function getGenreBySlug(slug: string): Promise<Genre> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories(*)')
    .eq('slug', slug)
    .single();
    
  return handleError(data, error) as Genre;
}

// Books

export async function getBooksByGenre(
  genreId: string,
  options?: {
    level?: DifficultyLevel | null;
    sort?: SortOption;
    tags?: string[];
  }
): Promise<Book[]> {
  let query = supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color, is_learning, is_fiction)
    `)
    .eq('genre_id', genreId);

  if (options?.level) {
    query = query.eq('difficulty_level', options.level);
  }

  if (options?.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  const sortField = options?.sort ?? 'expert_rating';
  query = query.order(sortField, { ascending: false, nullsFirst: false });

  const { data, error } = await query;
  return handleError(data, error) as Book[];
}

export async function getBookById(id: string): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color, is_learning, is_fiction),
      next_book:next_book_id(
        id, title, author, cover_image_url, isbn, expert_rating, difficulty_level
      )
    `)
    .eq('id', id)
    .single();
    
  return handleError(data, error) as Book;
}

export const getEditorsPicks = unstable_cache(
  async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select(`*, genres(id, name, slug, icon, color)`)
      .eq('is_editors_pick', true)
      .order('expert_rating', { ascending: false })
      .limit(6);
      
    return handleError(data, error) as Book[];
  },
  ['editors_picks'],
  { revalidate: 3600 }
);

export async function getSimilarBooks(genreId: string, currentBookId: string): Promise<Book[]> {
  if (!genreId) return [];

  const { data, error } = await supabase
    .from('books')
    .select(`*, genres(id, name, slug, icon, color)`)
    .eq('genre_id', genreId)
    .neq('id', currentBookId)
    .order('expert_rating', { ascending: false })
    .limit(3);
    
  return handleError(data, error) as Book[];
}

export const getFeaturedBooks = unstable_cache(
  async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select(`*, genres(id, name, slug, icon, color)`)
      .eq('is_featured', true)
      .order('expert_rating', { ascending: false })
      .limit(3);
      
    return handleError(data, error) as Book[];
  },
  ['featured_books'],
  { revalidate: 3600 }
);

export async function getFictionBooks(filters: FictionFilters): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(`*, genres!inner(id, name, slug, icon, color, is_fiction)`)
    .eq('genres.is_fiction', true)
    .order('expert_rating', { ascending: false });

  const allFictionBooks = handleError(data, error) as Book[];

  if (!filters.vibe && !filters.plot_type && !filters.length_category) {
    return allFictionBooks.slice(0, 15);
  }

  const scoredBooks = allFictionBooks.map((book) => {
    let score = 0;
    if (filters.vibe && book.vibe === filters.vibe) score += 3;
    if (filters.plot_type && book.plot_type === filters.plot_type) score += 3;
    if (filters.length_category && book.length_category === filters.length_category) score += 1;
    return { book, score };
  });

  const matchedBooks = scoredBooks
    .filter((b) => b.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.book.expert_rating || 0) - (a.book.expert_rating || 0);
    })
    .map((b) => b.book);

  return matchedBooks.slice(0, 15);
}

// Full-Text Search

const createCachedSearchEmbedding = unstable_cache(
  async (text: string): Promise<number[]> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          taskType: 'RETRIEVAL_QUERY',
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding provider returned status ${response.status}.`);
    }

    const payload = await response.json();
    const values = payload.embedding?.values;
    if (!Array.isArray(values) || values.length !== 768 ||
        !values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error('Embedding provider returned an invalid 768-value vector.');
    }
    return values;
  },
  ['chapterone-search-query-embedding-gemini-001-v1'],
  { revalidate: 86400 }
);

export async function searchBooks(query: string): Promise<Book[]> {
  if (!query.trim()) return [];

  // Sanitize query for PostgREST ilike — escape wildcards and remove chars that break .or() syntax
  const sanitized = query
    .replace(/[,()"]/g, '') // Remove chars that break PostgREST filter parsing
    .replace(/[%_\\]/g, '\\$&') // Escape LIKE wildcards
    .trim();
  
  if (!sanitized) return [];

  let localBooks: Book[] = [];

  // Strategy 0: "Title by Author" Pattern Matching (e.g. "Database Management Systems by Raghu Ramakrishnan")
  const byMatch = query.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    try {
      const titlePart = byMatch[1].replace(/[,()"]/g, '').replace(/[%_\\]/g, '\\$&').trim();
      const rawAuthor = byMatch[2].split(/\s+and\s+|,/i)[0].trim();
      const authorPart = rawAuthor.replace(/[,()"]/g, '').replace(/[%_\\]/g, '\\$&').trim();

      if (titlePart && authorPart) {
        const { data, error } = await supabase
          .from('books')
          .select(`*, genres(id, name, slug, icon, color)`)
          .ilike('title', `%${titlePart}%`)
          .ilike('author', `%${authorPart}%`)
          .order('expert_rating', { ascending: false })
          .limit(10);

        if (!error && data && data.length > 0) {
          localBooks = data as Book[];
        }
      }
    } catch (err) {
      console.error('[Search] Title-by-author strategy error:', err);
    }
  }

  // Strategy 1: semantic + full-text hybrid search. This keeps ordinary
  // catalog search aligned with the AI Finder while retaining a lexical-only
  // path when the embedding provider is not configured or unavailable.
  if (localBooks.length === 0) {
    try {
      const searchText = query.trim().slice(0, 500);
      const tokens = [...new Set(searchText.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].slice(0, 24);
      const lexicalQuery = [
        `"${searchText.replace(/"/g, ' ').slice(0, 180)}"`,
        ...tokens.map((token) => `"${token}"`),
      ].join(' OR ');

      let queryEmbedding: number[] | null = null;
      if (searchText.length >= 3) {
        try {
          queryEmbedding = await createCachedSearchEmbedding(searchText);
        } catch (error) {
          console.warn('[Search] Embedding unavailable; using lexical retrieval:', error);
        }
      }

      const { data: ranked, error: searchError } = await supabase.rpc('match_books_hybrid', {
        query_embedding: queryEmbedding,
        query_text: lexicalQuery,
        match_threshold: 0.0,
        match_count: 80,
      });

      if (searchError) {
        console.warn('[Search] Hybrid RPC unavailable; using keyword fallback:', searchError.message);
      } else if (ranked?.length) {
        const orderedIds: string[] = ranked.map((row: { id: string }) => row.id);
        const { data, error } = await supabase
          .from('books')
          .select('*, genres(id, name, slug, icon, color)')
          .in('id', orderedIds);

        if (error) {
          console.error('[Search] Could not load hybrid result details:', error.message);
        } else {
          const booksById = new Map((data as Book[]).map((book) => [book.id, book]));
          localBooks = orderedIds
            .map((id) => booksById.get(id))
            .filter((book): book is Book => Boolean(book));
        }
      }
    } catch (error) {
      console.error('[Search] Hybrid retrieval failed; using keyword fallback:', error);
    }
  }

  // Strategy 2: ilike search on title and author (fast, works for partial matches)
  if (localBooks.length === 0) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`*, genres(id, name, slug, icon, color)`)
        .or(`title.ilike."%${sanitized}%",author.ilike."%${sanitized}%"`)
        .order('expert_rating', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Search] Supabase ilike error:', error.message);
      } else if (data && data.length > 0) {
        localBooks = data as Book[];
      }
    } catch (err) {
      console.error('[Search] ilike query crashed:', err);
    }
  }

  // Strategy 3: If ilike found nothing, try splitting into individual words
  // Ranks results by how many words they match
  if (localBooks.length === 0 && sanitized.includes(' ')) {
    try {
      const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into']);
      const words = sanitized.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()));
      if (words.length > 0) {
        // Build an OR filter matching any word in title or author
        const filters = words.flatMap(word => [
          `title.ilike."%${word}%"`,
          `author.ilike."%${word}%"`,
        ]);
        
        const { data, error } = await supabase
          .from('books')
          .select(`*, genres(id, name, slug, icon, color)`)
          .or(filters.join(','))
          .order('expert_rating', { ascending: false })
          .limit(100);

        if (!error && data) {
          // Rank results by how many words they match to prevent unrelated books from burying good matches
          const ranked = (data as Book[]).map(book => {
            const textToSearch = `${book.title} ${book.author}`.toLowerCase();
            const matchCount = words.filter(w => textToSearch.includes(w.toLowerCase())).length;
            return { book, matchCount };
          });
          
          localBooks = ranked
            .filter(r => r.matchCount > 0)
            .sort((a, b) => b.matchCount - a.matchCount || (b.book.expert_rating || 0) - (a.book.expert_rating || 0))
            .map(r => r.book)
            .slice(0, 20);
        }
      }
    } catch (err) {
      console.error('[Search] word-split query failed:', err);
    }
  }

  // Deduplicate localBooks before returning or merging
  const getDedupKey = (title: string, author: string) => {
    const t = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const a = (author || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    return `${t}-${a}`;
  };

  const seenKeys = new Set<string>();
  const dedupedLocal: Book[] = [];
  for (const b of localBooks) {
    const key = getDedupKey(b.title, b.author || '');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      dedupedLocal.push(b);
    }
  }

  // Strategy 4: External API search for new books not in our database
  const { searchGoogleBooks, searchAppleBooks, searchOpenLibrary } = await import('./external-books');
  
  const [googleBooks, appleBooks, openLibraryBooks] = await Promise.all([
    searchGoogleBooks(query),
    searchAppleBooks(query),
    searchOpenLibrary(query)
  ]);

  // Combine external candidates (Apple books gives pristine covers; Google gives rich descriptions)
  const externalCandidates = [...appleBooks, ...googleBooks, ...openLibraryBooks];

  const cleanedQuery = query.toLowerCase().trim();
  const topExternalMatches: Book[] = [];
  const secondaryExternalMatches: Book[] = [];

  for (const externalBook of externalCandidates) {
    if (!externalBook.title) continue;
    const key = getDedupKey(externalBook.title, externalBook.author || '');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const bookObj = {
      ...externalBook,
      author: externalBook.author || 'Unknown',
      description: externalBook.description || 'No description available.',
      expert_rating: 0,
      community_rating: externalBook.community_rating || 0,
      is_editors_pick: false,
      is_featured: false,
      external_id: externalBook.external_id || null,
    } as unknown as Book;

    // Check if this new external book is an exact or strong title match for what was searched
    const extTitle = externalBook.title.toLowerCase();
    const isStrongMatch = extTitle === cleanedQuery || 
                          extTitle.startsWith(cleanedQuery) || 
                          cleanedQuery.includes(extTitle);

    if (isStrongMatch) {
      topExternalMatches.push(bookObj);
    } else {
      secondaryExternalMatches.push(bookObj);
    }
  }

  // Check if we have an exact title match in local database
  const hasExactLocalMatch = dedupedLocal.some(b => {
    const t = b.title.toLowerCase();
    return t === cleanedQuery || t.startsWith(cleanedQuery);
  });

  // If local DB didn't have an exact match, put the new external book right at the top!
  let allBooksToReturn: Book[] = [];
  if (!hasExactLocalMatch && topExternalMatches.length > 0) {
    allBooksToReturn = [...topExternalMatches, ...dedupedLocal, ...secondaryExternalMatches].slice(0, 30);
  } else {
    allBooksToReturn = [...dedupedLocal, ...topExternalMatches, ...secondaryExternalMatches].slice(0, 30);
  }

  return allBooksToReturn;
}

export const getTopRatedBooks = unstable_cache(
  async (limit = 8): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select(`*, genres(id, name, slug, icon, color)`)
      .order('expert_rating', { ascending: false, nullsFirst: false })
      .limit(limit);
      
    return handleError(data, error) as Book[];
  },
  ['top_rated_books'],
  { revalidate: 3600 }
);

export async function getFreeBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*, genres(id, name, slug, icon, color)')
    .not('free_reading_url', 'is', null)
    .order('community_rating', { ascending: false })
    .limit(40);
    
  return handleError(data, error) as Book[];
}
