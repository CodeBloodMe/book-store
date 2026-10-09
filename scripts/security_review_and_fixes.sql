-- ======================================================================================
-- DBMS Lab Phase 4: Security Review & Constraint Fixes
-- (Prepared for submission; easily removable, not executed against live DB yet)
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- PART A: Security Fixes for Stored Procedures
-- --------------------------------------------------------------------------------------
-- Finding: Several functions (e.g., match_mystery_book, find_reading_path) use 
-- SECURITY DEFINER but lack a strict search_path. This is a vulnerability that could 
-- allow privilege escalation via path manipulation.
-- Fix: Force the search_path to public for these functions.

ALTER FUNCTION public.match_mystery_book(session_id UUID, match_limit INT) 
SET search_path = public;

ALTER FUNCTION public.find_reading_path(start_id UUID, end_id UUID, max_depth INT) 
SET search_path = public;

-- --------------------------------------------------------------------------------------
-- PART B: Missing Foreign Key Fixes
-- --------------------------------------------------------------------------------------
-- Finding: The live database reflection showed missing foreign key relationships from 
-- books, reviews, and user_shelves to their parent tables.
-- Fix: Add strict relational integrity constraints.

-- 1. Fix books -> authors relationship
-- Note: Assuming books.author field should actually be a UUID author_id linking to authors.id
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS author_id UUID;

ALTER TABLE public.books
ADD CONSTRAINT fk_books_author
FOREIGN KEY (author_id) 
REFERENCES public.authors(id)
ON DELETE SET NULL;

-- 2. Fix reviews -> books relationship
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_book
FOREIGN KEY (book_id) 
REFERENCES public.books(id)
ON DELETE CASCADE;

-- 3. Fix user_shelves -> books relationship
ALTER TABLE public.user_shelves
ADD CONSTRAINT fk_shelves_book
FOREIGN KEY (book_id) 
REFERENCES public.books(id)
ON DELETE CASCADE;
