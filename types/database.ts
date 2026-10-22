// ============================================================
// ChapterOne — TypeScript Database Interfaces
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
  is_learning: boolean;
  is_fiction: boolean;
  book_count: number;
  sort_order: number;
  super_categories?: SuperCategory;
}

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LengthCategory = 'Quick Read' | 'Standard' | 'Epic';
export type SortOption = 'expert_rating' | 'community_rating' | 'published_year';

export interface Author {
  id: string;
  name: string;
  ai_bio: string | null;
  ai_style: string[] | null;
  ai_last_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  genre_id: string;
  title: string;
  author: string;
  description: string | null;
  cover_image_url: string | null;
  page_count: number | null;
  published_year: number | null;
  isbn: string | null;
  language: string;
  series_name: string | null;
  series_number: number | null;
  amazon_url: string | null;
  goodreads_url: string | null;
  expert_rating: number | null;
  community_rating: number | null;
  total_reviews: number;
  /** User-generated review average; kept separate from imported community_rating. */
  user_review_average: number;
  /** Count of rows in the local reviews table, maintained by a DB trigger. */
  user_review_count: number;
  expert_quote: string | null;
  expert_name: string | null;
  difficulty_level: DifficultyLevel | null;
  next_book_id: string | null;
  tags: string[];
  fiction_genres: string[] | null;
  vibe: string | null;
  plot_type: string | null;
  length_category: LengthCategory | null;
  is_featured: boolean;
  is_editors_pick: boolean;
  is_bestseller: boolean;
  not_recommended_for: string[] | null;
  external_id: string | null;
  free_reading_url: string | null;
  goodreads_scraped: boolean;
  genres?: Genre;
  created_at: string;
  updated_at: string;
  ai_review_summary: string | null;
  ai_pros: string[] | null;
  ai_cons: string[] | null;
  ai_rating: number | null;
  ai_last_updated: string | null;
  next_book?: Pick<Book, 'id' | 'title' | 'author' | 'cover_image_url' | 'expert_rating' | 'difficulty_level' | 'isbn'> | null;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  content: string;
  created_at: string;
  source: string;
  external_author_name: string | null;
  external_author_image_url: string | null;
}

export interface UserShelf {
  id: string;
  user_id: string;
  book_id: string;
  status: 'want_to_read' | 'reading' | 'read';
  created_at: string;
  updated_at: string;
}

export interface FictionFilters {
  genre_slugs: string[];
  length_category: LengthCategory | null;
  vibe?: string | null;
  plot_type?: string | null;
}

export interface GenreFilters {
  level: DifficultyLevel | null;
  sort: SortOption;
  tags: string[];
}

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
