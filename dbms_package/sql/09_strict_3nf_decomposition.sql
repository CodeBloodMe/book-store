-- ======================================================================================
-- VIT BCSE302P DBMS Lab Assessment 8, 9 & 10
-- Faculty: Dr. V. Sivakumar | Slot: L25+L26
-- Student Name: Krish | Register Number: 24BCE0846
-- 
-- NORMALIZATION ASSESSMENT: PURE 3NF RELATIONAL DECOMPOSITION SCHEMA & VIEWS
-- Resolves the Academic Strict 3NF Gap by decoupling array attributes and denormalized fields
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- 1. DECOMPOSITION TABLE 1: book_authors_3nf
-- Resolves transitive dependency and M:N relationship between books and authors.
-- FD: (book_id, author_id) -> role
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.book_authors_3nf (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
    author_role VARCHAR(50) DEFAULT 'Primary Author',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (book_id, author_id)
);

-- --------------------------------------------------------------------------------------
-- 2. DECOMPOSITION TABLE 2: book_tags_3nf
-- Resolves 1NF non-atomic repeating array attribute (books.tags TEXT[])
-- FD: (book_id, tag) -> created_at
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.book_tags_3nf (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (book_id, tag)
);

-- --------------------------------------------------------------------------------------
-- 3. DECOMPOSITION TABLE 3: book_fiction_genres_3nf
-- Resolves 1NF non-atomic repeating array attribute (books.fiction_genres TEXT[])
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.book_fiction_genres_3nf (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    fiction_genre VARCHAR(100) NOT NULL,
    PRIMARY KEY (book_id, fiction_genre)
);

-- --------------------------------------------------------------------------------------
-- 4. DECOMPOSITION TABLE 4: book_ai_insights_3nf
-- Resolves 1NF non-atomic repeating arrays (books.ai_pros TEXT[], books.ai_cons TEXT[])
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.book_ai_insights_3nf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    insight_type VARCHAR(10) CHECK (insight_type IN ('PRO', 'CON')),
    statement TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------------------
-- 5. DECOMPOSITION TABLE 5: author_styles_3nf
-- Resolves 1NF non-atomic repeating array attribute (authors.ai_style TEXT[])
-- --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.author_styles_3nf (
    author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
    style_descriptor VARCHAR(100) NOT NULL,
    PRIMARY KEY (author_id, style_descriptor)
);

-- --------------------------------------------------------------------------------------
-- 6. PURE 3NF NORMALIZED RELATIONAL VIEW
-- Reconstructs the complete entity representation dynamically via relational JOINs
-- --------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.books_strict_3nf_view AS
SELECT 
    b.id,
    b.title,
    b.isbn,
    b.published_year,
    b.page_count,
    b.community_rating,
    b.expert_rating,
    g.id AS genre_id,
    g.name AS genre_name,
    sc.id AS super_category_id,
    sc.name AS super_category_name,
    COALESCE(a.name, b.author) AS primary_author_name
FROM public.books b
LEFT JOIN public.genres g ON g.id = b.genre_id
LEFT JOIN public.super_categories sc ON sc.id = g.super_category_id
LEFT JOIN public.authors a ON a.id = b.id;
