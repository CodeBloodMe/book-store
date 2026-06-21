

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

// Error Handling Helper

/**
 * A helper function to check if Supabase returned an error.
 * If it did, we crash the function and print the error to the server console.
 * This saves us from writing `if (error) throw error;` 50 times!
 */
function handleError<T>(data: T | null, error: unknown): T {
  if (error) {
    console.error('[Database Error]', error);
    // Extract the error message safely, or provide a default
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

// Super Categories

/** 
 * Fetches all parent categories (Learning, Fiction, Personal Growth).
 * Uses Next.js caching so we only hit the database once every hour (3600 seconds).
 */
export const getAllSuperCategories = unstable_cache(
  async (): Promise<SuperCategory[]> => {
    // We select ALL columns (*) from the 'super_categories' table
    const { data, error } = await supabase
      .from('super_categories')
      .select('*')
      .order('name'); // Alphabetical order
      
    return handleError(data, error) as SuperCategory[];
  },
  ['super_categories'], // The unique ID for this cache
  { revalidate: 3600 }  // Delete cache and fetch fresh data after 1 hour
);

// Genres

/** 
 * Fetches ALL genres and joins them with their parent super-category.
 * E.g., Returns "Sci-Fi" and attaches the "Fiction" super-category to it.
 */
export const getAllGenres = unstable_cache(
  async (): Promise<Genre[]> => {
    const { data, error } = await supabase
      .from('genres')
      // Fetch genres, their parent categories, AND a count of books in each genre
      .select('*, super_categories(*), books(count)')
      .order('sort_order', { ascending: true });
      
    const rawData = handleError(data, error) as any[];
    
    // Filter out genres that have absolutely zero books
    const populatedGenres = rawData.filter(genre => {
      // Depending on the Supabase/PostgREST version, count might be an array or object
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
  ['all_genres_populated'], // Changed cache key so it forces a refresh
  { revalidate: 3600 }
);

/** 
 * Fetches genres that belong to a specific super-category URL slug.
 */
export async function getGenresBySuperCategory(superSlug: string): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories!inner(*)')
    .eq('super_categories.slug', superSlug) // Filter where parent slug matches
    .order('sort_order');
    
  return handleError(data, error) as Genre[];
}

/** 
 * Fetch a single genre by its URL slug.
 */
export async function getGenreBySlug(slug: string): Promise<Genre> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories(*)')
    .eq('slug', slug)
    .single(); // We only expect ONE result, so return an object instead of an array
    
  return handleError(data, error) as Genre;
}

// Books

/**
 * Fetches books for a specific genre.
 * Includes optional filters for Difficulty Level and Tags.
 */
export async function getBooksByGenre(
  genreId: string,
  options?: {
    level?: DifficultyLevel | null;
    sort?: SortOption;
    tags?: string[];
  }
): Promise<Book[]> {
  // 1. Start building the database query
  let query = supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color, is_learning, is_fiction)
    `)
    .eq('genre_id', genreId);

  // 2. Add filters if the user requested them
  if (options?.level) {
    query = query.eq('difficulty_level', options.level);
  }

  // If the user selected tags, check if the book's tags array overlaps with the requested tags
  if (options?.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  // 3. Sort the results (Default: Highest expert rating first)
  const sortField = options?.sort ?? 'expert_rating';
  query = query.order(sortField, { ascending: false, nullsFirst: false });

  // 4. Actually execute the query against the database
  const { data, error } = await query;
  return handleError(data, error) as Book[];
}

/**
 * Fetches a single book by its ID.
 * It also automatically fetches the "Next Book" to recommend!
 */
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

/** 
 * Fetches 6 books manually marked by admins as "Editor's Picks"
 */
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

/** 
 * Fetches 3 books from the same genre (excluding the book currently being viewed)
 */
export async function getSimilarBooks(genreId: string, currentBookId: string): Promise<Book[]> {
  if (!genreId) return [];

  const { data, error } = await supabase
    .from('books')
    .select(`*, genres(id, name, slug, icon, color)`)
    .eq('genre_id', genreId)
    .neq('id', currentBookId) // neq = Not Equal To (Exclude current book)
    .order('expert_rating', { ascending: false })
    .limit(3);
    
  return handleError(data, error) as Book[];
}

/** 
 * Fetches the top 3 featured books for the hero slider
 */
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

// Fiction Taste-Maker

/**
 * A custom algorithm to find fiction books based on Vibes, Plot Types, and Lengths.
 * Instead of strictly requiring ALL filters to match (which often results in 0 books),
 * this uses a scoring system to find the "best fit" books.
 */
export async function getFictionBooks(filters: FictionFilters): Promise<Book[]> {
  // 1. Fetch ALL fiction books
  const { data, error } = await supabase
    .from('books')
    .select(`*, genres!inner(id, name, slug, icon, color, is_fiction)`)
    .eq('genres.is_fiction', true)
    .order('expert_rating', { ascending: false });

  const allFictionBooks = handleError(data, error) as Book[];

  // 2. If the user didn't pick any filters, just return the top 15 fiction books
  if (!filters.vibe && !filters.plot_type && !filters.length_category) {
    return allFictionBooks.slice(0, 15);
  }

  // 3. Score each book based on how many filters it matches!
  const scoredBooks = allFictionBooks.map((book) => {
    let score = 0;
    // Vibes and Plot Types are very important, so they grant +3 points
    if (filters.vibe && book.vibe === filters.vibe) score += 3;
    if (filters.plot_type && book.plot_type === filters.plot_type) score += 3;
    
    // Book length is nice to have, but less important, so it grants +1 point
    if (filters.length_category && book.length_category === filters.length_category) score += 1;
    
    return { book, score };
  });

  // 4. Sort the books so the highest scores are at the top
  const matchedBooks = scoredBooks
    .filter((b) => b.score > 0) // Remove books that matched absolutely nothing
    .sort((a, b) => {
      // Primary sort: Our custom Score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tie-breaker: If scores are tied, the book with the higher expert rating wins!
      return (b.book.expert_rating || 0) - (a.book.expert_rating || 0);
    })
    .map((b) => b.book);

  // 5. Return the top 15 results
  return matchedBooks.slice(0, 15);
}

// Full-Text Search

/**
 * Performs a search across our local database AND external APIs (Google/OpenLibrary).
 * This ensures that even if we don't have the book, the user still finds it!
 */
export async function searchBooks(query: string): Promise<Book[]> {
  if (!query.trim()) return [];

  // 1. Search our local Supabase database
  // `search_vector` is a special PostgreSQL feature that makes searching text incredibly fast
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

  // 2. Search external APIs simultaneously for speed
  const { searchGoogleBooks, searchOpenLibrary } = await import('./external-books');
  
  const [googleBooks, openLibraryBooks] = await Promise.all([
    searchGoogleBooks(query),
    searchOpenLibrary(query)
  ]);

  // 3. Merge results and remove duplicate books
  const allBooksToReturn: Book[] = [...localBooks];
  
  // Create a tracking list of titles we've already seen (converted to lowercase, letters/numbers only)
  // Example: "Harry Potter & The Sorcerer's Stone!" -> "harrypotterthesorcerersstone"
  const seenTitles = new Set(localBooks.map(b => b.title.toLowerCase().replace(/[^a-z0-9]/g, '')));

  // Helper function to carefully add external books to our master list
  const addExternalBooks = (externalBooks: Partial<Book>[]) => {
    for (const externalBook of externalBooks) {
      const normalizedTitle = (externalBook.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // If we haven't seen this title yet, and we have fewer than 30 results total...
      if (!seenTitles.has(normalizedTitle) && allBooksToReturn.length < 30) {
        seenTitles.add(normalizedTitle); // Mark it as seen
        
        // Push a cleaned-up version of the book into our final array
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

// Trending

/** 
 * Returns the top highest-rated books across ALL genres for the homepage.
 */
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
