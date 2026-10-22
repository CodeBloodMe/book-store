-- ChapterOne consolidated schema bootstrap for a BRAND-NEW Supabase PostgreSQL project.
-- DO NOT run this as a migration against the existing populated project. Use the repository's
-- migrations and audit scripts there. This file is a consolidated reference for assessment review.
-- It uses CREATE TABLE IF NOT EXISTS and creates no book catalog data except a tiny sample category.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Catalog hierarchy
CREATE TABLE IF NOT EXISTS public.super_categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL UNIQUE,
    slug varchar(100) NOT NULL UNIQUE,
    icon text,
    color varchar(50)
);

CREATE TABLE IF NOT EXISTS public.genres (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_category_id uuid NOT NULL REFERENCES public.super_categories(id),
    name varchar(100) NOT NULL UNIQUE,
    slug varchar(100) NOT NULL UNIQUE,
    icon text,
    description text,
    color varchar(50),
    is_learning boolean DEFAULT false,
    is_fiction boolean DEFAULT false,
    book_count integer DEFAULT 0,
    sort_order integer DEFAULT 0
);

-- 2. Books. embedding and search_vector are PostgreSQL-specific types.
CREATE TABLE IF NOT EXISTS public.books (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    genre_id uuid NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    author varchar(255) NOT NULL,
    description text,
    cover_image_url text,
    page_count integer CHECK (page_count IS NULL OR page_count > 0),
    published_year integer,
    isbn varchar(20),
    language varchar(50) DEFAULT 'English',
    amazon_url text,
    goodreads_url text,
    expert_rating numeric(3,2) CHECK (expert_rating BETWEEN 0 AND 5),
    community_rating numeric(3,2) CHECK (community_rating BETWEEN 0 AND 5),
    total_reviews integer NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    expert_quote text,
    expert_name varchar(150),
    difficulty_level varchar(20) CHECK (difficulty_level IN ('Beginner','Intermediate','Advanced')),
    next_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
    tags text[] DEFAULT '{}',
    vibe varchar(100),
    plot_type varchar(100),
    length_category varchar(20) CHECK (length_category IN ('Quick Read','Standard','Epic')),
    is_featured boolean DEFAULT false,
    is_editors_pick boolean DEFAULT false,
    is_bestseller boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    search_vector tsvector,
    series_name varchar(255),
    series_number integer,
    external_id varchar UNIQUE,
    ai_review_summary text,
    ai_pros text[],
    ai_cons text[],
    ai_rating numeric(3,2) CHECK (ai_rating BETWEEN 0 AND 5),
    ai_last_updated timestamptz,
    fiction_genres text[] DEFAULT '{}',
    free_reading_url varchar,
    embedding vector(768),
    embedding_model text,
    author_image_url text,
    author_bio text
);

CREATE TABLE IF NOT EXISTS public.authors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    ai_bio text,
    ai_style text[],
    ai_last_updated timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Reviews: users are managed by Supabase Auth, so user_id references auth.users.
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    reviewer_name varchar NOT NULL,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    source text DEFAULT 'local',
    external_author_name text
);

CREATE TABLE IF NOT EXISTS public.user_shelves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    status varchar(50) NOT NULL CHECK (status IN ('want_to_read','reading','read')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, book_id)
);

-- One role-bearing profile table; do not create separate Admin/Student/Faculty tables.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar NOT NULL,
    role varchar(50) NOT NULL DEFAULT 'User'
      CHECK (role IN ('Admin','User','Faculty','Student')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. BookWeb graph: canonical undirected pair is enforced by the application builder today.
-- The stored table constraint below prevents self-loops and duplicate ordered pairs.
CREATE TABLE IF NOT EXISTS public.book_edges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_a_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    book_b_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    weight double precision NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
    relationship_type varchar(50) NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(book_a_id, book_b_id),
    CHECK (book_a_id <> book_b_id)
);

-- 5. Blind Date: anonymous session IDs are retained as text to match the current implementation.
CREATE TABLE IF NOT EXISTS public.user_reader_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL UNIQUE,
    mood varchar(50),
    pace_preference varchar(50),
    complexity_preference varchar(50),
    era_preference varchar(50),
    length_preference varchar(50),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blind_date_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    accepted boolean NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 6. Query indexes
CREATE INDEX IF NOT EXISTS idx_books_search ON public.books USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_books_genre ON public.books(genre_id);
CREATE INDEX IF NOT EXISTS idx_books_difficulty ON public.books(genre_id, difficulty_level);
CREATE INDEX IF NOT EXISTS idx_books_rating ON public.books(expert_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_books_next_book ON public.books(next_book_id);
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_books_fiction_genres ON public.books USING gin(fiction_genres);
CREATE INDEX IF NOT EXISTS idx_books_embedding ON public.books USING hnsw(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON public.genres(slug);
CREATE INDEX IF NOT EXISTS idx_genres_category ON public.genres(super_category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON public.reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_edges_a ON public.book_edges(book_a_id);
CREATE INDEX IF NOT EXISTS idx_book_edges_b ON public.book_edges(book_b_id);
CREATE INDEX IF NOT EXISTS idx_book_edges_relationship ON public.book_edges(relationship_type);
CREATE INDEX IF NOT EXISTS idx_shelves_user ON public.user_shelves(user_id);
CREATE INDEX IF NOT EXISTS idx_blind_interactions_book ON public.blind_date_interactions(book_id);
CREATE INDEX IF NOT EXISTS idx_blind_interactions_session ON public.blind_date_interactions(session_id);

-- 7. Full-text search trigger
CREATE OR REPLACE FUNCTION public.books_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS books_search_vector_trigger ON public.books;
CREATE TRIGGER books_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.books_search_vector_update();

-- 8. updated_at trigger for the books table
CREATE OR REPLACE FUNCTION public.chapterone_set_books_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS chapterone_books_updated_at ON public.books;
CREATE TRIGGER chapterone_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.chapterone_set_books_updated_at();

-- 9. Assessment view: derive rating aggregate instead of duplicating it in the base table.
CREATE OR REPLACE VIEW public.book_details_view AS
SELECT b.id AS book_id, b.title,
       COALESCE(AVG(r.rating), 0) AS average_rating,
       COUNT(r.id) AS review_count
FROM public.books b
LEFT JOIN public.reviews r ON r.book_id = b.id
GROUP BY b.id, b.title;

-- 10. Minimal category rows so the database is immediately testable after a fresh setup.
INSERT INTO public.super_categories(name, slug, icon, color)
VALUES ('Learning', 'learning', 'book-open', '#1D4ED8')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.genres(super_category_id, name, slug, description, is_learning, is_fiction, sort_order)
SELECT id, 'Programming', 'programming', 'Programming and software development books', true, false, 1
FROM public.super_categories WHERE slug='learning'
ON CONFLICT (slug) DO NOTHING;

-- Security policies are intentionally not broadly opened here. Review `sql/05_security_audit.sql`
-- and apply least-privilege RLS policies appropriate to the selected authentication flows.
-- The Supabase Auth trigger and policies are covered separately in sql/06_auth_rbac_setup.sql.
