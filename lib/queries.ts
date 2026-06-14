// ============================================================
// ChapterOne — Centralized Query Functions
// All Supabase data fetching lives here.
// Import and call these in Server Components only.
// ============================================================

import { supabase } from './supabase';
import type {
  Genre,
  Book,
  SuperCategory,
  DifficultyLevel,
  SortOption,
  FictionFilters,
} from '@/types/database';

// ── Helper: throw on Supabase error ──────────────────────────
function handleError<T>(data: T | null, error: unknown): T {
  if (error) {
    console.error('[ChapterOne Query Error]', error);
    throw new Error(typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: string }).message)
      : 'Database query failed'
    );
  }
  if (data === null) throw new Error('No data returned');
  return data;
}

// ── Super Categories ──────────────────────────────────────────
/** Fetches all super-categories (Learning, Fiction, Personal Growth) for homepage tabs */
export async function getAllSuperCategories(): Promise<SuperCategory[]> {
  const { data, error } = await supabase
    .from('super_categories')
    .select('*')
    .order('name');
  return handleError(data, error) as SuperCategory[];
}

// ── Genres ────────────────────────────────────────────────────
/** Fetches ALL genres with their super-category. Used in Navbar mega-menu. */
export async function getAllGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories(*)')
    .order('sort_order', { ascending: true });
  return handleError(data, error) as Genre[];
}

/** Fetches genres for a specific super-category slug. Used on homepage tabs. */
export async function getGenresBySuperCategory(superSlug: string): Promise<Genre[]> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories!inner(*)')
    .eq('super_categories.slug', superSlug)
    .order('sort_order');
  return handleError(data, error) as Genre[];
}

/** Fetch a single genre by its URL slug. Used on genre page header. */
export async function getGenreBySlug(slug: string): Promise<Genre> {
  const { data, error } = await supabase
    .from('genres')
    .select('*, super_categories(*)')
    .eq('slug', slug)
    .single();
  return handleError(data, error) as Genre;
}

// ── Books ─────────────────────────────────────────────────────
/**
 * Fetches books for a specific genre with optional filters.
 * Always returns sorted by expert_rating descending by default,
 * so the best books appear first (core promise of the platform).
 */
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

  // Filter by difficulty level if provided (Beginner/Intermediate/Advanced)
  if (options?.level) {
    query = query.eq('difficulty_level', options.level);
  }

  // Filter by tags if provided (e.g., ["Python", "Machine Learning"])
  if (options?.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  // Sort: default is expert_rating (highest = best books shown first)
  const sortField = options?.sort ?? 'expert_rating';
  query = query.order(sortField, { ascending: false, nullsFirst: false });

  const { data, error } = await query;
  return handleError(data, error) as Book[];
}

/**
 * Fetches a single book with full detail, including:
 * - Its genre
 * - The next recommended book (for the "What to Read Next" panel)
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

/** Fetches books marked as editors_pick for the homepage section */
export async function getEditorsPicks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color)
    `)
    .eq('is_editors_pick', true)
    .order('expert_rating', { ascending: false })
    .limit(6);
  return handleError(data, error) as Book[];
}

/** Fetches books marked as featured for the homepage hero */
export async function getFeaturedBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color)
    `)
    .eq('is_featured', true)
    .order('expert_rating', { ascending: false })
    .limit(3);
  return handleError(data, error) as Book[];
}

// ── Fiction Taste-Maker ───────────────────────────────────────
export async function getFictionBooks(filters: FictionFilters): Promise<Book[]> {
  // Fetch all fiction books
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      genres!inner(id, name, slug, icon, color, is_fiction)
    `)
    .eq('genres.is_fiction', true)
    .order('expert_rating', { ascending: false });

  const books = handleError(data, error) as Book[];

  // If no filters are active, just return the top rated fiction books
  if (!filters.vibe && !filters.plot_type && !filters.length_category) {
    return books.slice(0, 15);
  }

  // Score each book based on how many filters it matches
  const scoredBooks = books.map((book) => {
    let score = 0;
    if (filters.vibe && book.vibe === filters.vibe) score += 3;
    if (filters.plot_type && book.plot_type === filters.plot_type) score += 3;
    if (filters.length_category && book.length_category === filters.length_category) score += 1;
    return { book, score };
  });

  // Filter out books with 0 score (unless we want to always show something, but showing completely unrelated books is bad UX)
  // Actually, if score is 0, it means it matches absolutely nothing. We should filter those out.
  const matchedBooks = scoredBooks
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score || (b.book.expert_rating || 0) - (a.book.expert_rating || 0))
    .map((b) => b.book);

  // If literally nothing matches any single filter, return empty so the UI shows "No matches found"
  // but this makes it MUCH more forgiving than strict AND filtering.
  return matchedBooks.slice(0, 15);
}

// ── Full-Text Search ──────────────────────────────────────────
/**
 * Full-text search using PostgreSQL tsvector across title, author, description, tags.
 * The search_vector column is auto-updated by a DB trigger on insert/update.
 */
export async function searchBooks(query: string): Promise<Book[]> {
  if (!query.trim()) return [];

  // 1. Fetch from local Supabase DB
  const { data: localData, error } = await supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color)
    `)
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    })
    .order('expert_rating', { ascending: false })
    .limit(15);

  const localBooks = error ? [] : (localData as Book[]);

  // 2. Fetch from Google Books and OpenLibrary
  // We need to import the new functions at the top of the file, but we can dynamic import here to avoid circular dep issues if any, or just import at the top. Let's just import here.
  const { searchGoogleBooks, searchOpenLibrary } = await import('./external-books');
  
  const [googleBooks, olBooks] = await Promise.all([
    searchGoogleBooks(query),
    searchOpenLibrary(query)
  ]);

  // 3. Deduplicate and merge results
  const allBooks: Book[] = [...localBooks];
  
  // Track seen titles (lowercase, alphanumeric only) to avoid duplicates
  const seenTitles = new Set(localBooks.map(b => b.title.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const addToResults = (extBooks: Partial<Book>[]) => {
    for (const b of extBooks) {
      const normalizedTitle = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTitles.has(normalizedTitle) && allBooks.length < 30) {
        seenTitles.add(normalizedTitle);
        allBooks.push({
          ...b,
          // Provide defaults for UI compatibility
          author: b.author || 'Unknown',
          description: b.description || 'No description available.',
          expert_rating: 0,
          community_rating: b.community_rating || 0,
          vibe: null,
          plot_type: null,
          length_category: null,
          is_editors_pick: false,
          is_featured: false,
          external_id: b.external_id || null,
        } as unknown as Book);
      }
    }
  };

  addToResults(googleBooks);
  addToResults(olBooks);

  return allBooks;
}

// ── Trending / Highest Rated ──────────────────────────────────
/** Returns the top N books by expert rating across all genres — for homepage trending */
export async function getTopRatedBooks(limit = 8): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      genres(id, name, slug, icon, color)
    `)
    .order('expert_rating', { ascending: false, nullsFirst: false })
    .limit(limit);
  return handleError(data, error) as Book[];
}
