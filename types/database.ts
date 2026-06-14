// ============================================================
// BookSphere — TypeScript Database Interfaces
// All types mirror the Supabase PostgreSQL schema exactly.
// Import from here in every component and query function.
// ============================================================

export interface SuperCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export interface Genre {
  id: string;
  super_category_id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  color: string;
  /** If true: show level filter (Beginner/Intermediate/Advanced) + "Next Book" panel */
  is_learning: boolean;
  /** If true: show Fiction Taste-Maker filters (vibe, plot, length) */
  is_fiction: boolean;
  book_count: number;
  sort_order: number;
  /** Joined super category (optional — only when selected with *) */
  super_categories?: SuperCategory;
}

// Valid difficulty levels for learning genres
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

// Valid length categories for fiction genres
export type LengthCategory = 'Quick Read' | 'Standard' | 'Epic';

// Sort options for the genre book list
export type SortOption = 'expert_rating' | 'community_rating' | 'published_year';

export interface Book {
  id: string;
  genre_id: string;

  // Core Info
  title: string;
  author: string;
  description: string | null;
  cover_image_url: string | null;
  page_count: number | null;
  published_year: number | null;
  isbn: string | null;
  language: string;

  // External Links
  amazon_url: string | null;
  goodreads_url: string | null;

  // Ratings — aggregated from expert consensus + Goodreads/Amazon
  expert_rating: number | null;
  community_rating: number | null;
  total_reviews: number;

  // Expert Endorsement — the "social proof" shown on cards
  expert_quote: string | null;
  expert_name: string | null;

  // Level System (for learning genres)
  difficulty_level: DifficultyLevel | null;

  // "What to Read Next" — FK to the recommended follow-up book
  next_book_id: string | null;

  // Tags for filtering and search
  tags: string[];

  // Fiction Taste-Maker Filters
  vibe: string | null;
  plot_type: string | null;
  length_category: LengthCategory | null;

  // Curation flags
  is_featured: boolean;
  is_editors_pick: boolean;
  is_bestseller: boolean;

  // Not recommended for (anti-recommendations)
  not_recommended_for: string[] | null;

  // External Book Import
  external_id: string | null;

  // Joined genre (optional — only when selected with *)
  genres?: Genre;

  created_at: string;
  updated_at: string;

  // AI Review Aggregator
  ai_review_summary: string | null;
  ai_pros: string[] | null;
  ai_cons: string[] | null;
  ai_rating: number | null;
  ai_last_updated: string | null;

  // Joined relations (optional — populated when queried with select)

  /**
   * The next book in the reading chain. Only the minimal fields are selected
   * to avoid over-fetching in queries — we just need enough for the NextBookPanel.
   */
  next_book?: Pick<Book, 'id' | 'title' | 'author' | 'cover_image_url' | 'expert_rating' | 'difficulty_level' | 'isbn'> | null;
}

/** Filters for the Fiction Taste-Maker questionnaire */
export interface FictionFilters {
  vibe: string | null;
  plot_type: string | null;
  length_category: LengthCategory | null;
}

/** Filters for the Genre Book List (Learning genres) */
export interface GenreFilters {
  level: DifficultyLevel | null;
  sort: SortOption;
  tags: string[];
}

/** Minimal book shape used in search results and small cards */
export type BookSummary = Pick<
  Book,
  | 'id'
  | 'title'
  | 'author'
  | 'cover_image_url'
  | 'expert_rating'
  | 'difficulty_level'
  | 'is_bestseller'
  | 'genre_id'
  | 'genres'
>;
