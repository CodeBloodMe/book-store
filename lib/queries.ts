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
  
  if (data === null) {
    throw new Error('Database returned empty data');
  }
  
  return data;
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
      
    const rawData = handleError(data, error) as any[];
    
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

export async function searchBooks(query: string): Promise<Book[]> {
  if (!query.trim()) return [];

  const { data: localData, error } = await supabase
    .from('books')
    .select(`*, genres(id, name, slug, icon, color)`)
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    })
    .order('expert_rating', { ascending: false })
    .limit(15);

  const localBooks = error ? [] : (localData as Book[]);

  const { searchGoogleBooks, searchOpenLibrary } = await import('./external-books');
  
  const [googleBooks, openLibraryBooks] = await Promise.all([
    searchGoogleBooks(query),
    searchOpenLibrary(query)
  ]);

  const allBooksToReturn: Book[] = [...localBooks];
  
  const getDedupKey = (title: string, author: string) => {
    const t = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const a = (author || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    return `${t}-${a}`;
  };

  const seenKeys = new Set(localBooks.map(b => getDedupKey(b.title, b.author || '')));

  const addExternalBooks = (externalBooks: Partial<Book>[]) => {
    for (const externalBook of externalBooks) {
      const key = getDedupKey(externalBook.title || '', externalBook.author || '');
      
      if (!seenKeys.has(key) && allBooksToReturn.length < 30) {
        seenKeys.add(key);
        
        allBooksToReturn.push({
          ...externalBook,
          author: externalBook.author || 'Unknown',
          description: externalBook.description || 'No description available.',
          expert_rating: 0,
          community_rating: externalBook.community_rating || 0,
          is_editors_pick: false,
          is_featured: false,
          external_id: externalBook.external_id || null,
        } as unknown as Book);
      }
    }
  };

  addExternalBooks(googleBooks);
  addExternalBooks(openLibraryBooks);

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
