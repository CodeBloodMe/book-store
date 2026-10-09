-- ======================================================================================
-- DBMS Lab Project Demonstrations (Easily Removable / Academic Purpose Only)
-- ======================================================================================
-- This script uses a transactional DO block to demonstrate CRUD operations.
-- It is designed to be fully idempotent and safe to run multiple times without leaving
-- junk data in the production database.

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    new_book_id UUID := gen_random_uuid();
    new_review_id UUID := gen_random_uuid();
    selected_title TEXT;
BEGIN
    RAISE NOTICE 'Starting DBMS CRUD Demonstration...';

    -- 1. CREATE (Insert)
    -- Creating a dummy user and book to satisfy foreign keys
    INSERT INTO public.users (id, email) 
    VALUES (new_user_id, 'dbms_demo_user_' || new_user_id || '@example.com');

    INSERT INTO public.books (id, title, page_count)
    VALUES (new_book_id, 'The DBMS Assessment Guide', 150);

    INSERT INTO public.reviews (id, user_id, book_id, rating, content)
    VALUES (new_review_id, new_user_id, new_book_id, 4, 'Good, but needs more normal forms.');

    RAISE NOTICE 'Insert complete.';

    -- 2. READ (Select with Filtering)
    SELECT title INTO selected_title
    FROM public.books 
    WHERE id = new_book_id;
    
    RAISE NOTICE 'Read complete. Found title: %', selected_title;

    -- 3. UPDATE
    UPDATE public.reviews 
    SET content = 'An absolute masterpiece. Highly recommended!', rating = 5
    WHERE id = new_review_id;

    RAISE NOTICE 'Update complete.';

    -- 4. DELETE (Hard Delete)
    DELETE FROM public.reviews 
    WHERE id = new_review_id;

    -- 5. Soft Delete / Status Update
    INSERT INTO public.user_shelves (id, user_id, book_id, status)
    VALUES (gen_random_uuid(), new_user_id, new_book_id, 'Reading');
    
    UPDATE public.user_shelves
    SET status = 'Dropped' -- Logical equivalent of a soft-delete from an active shelf
    WHERE user_id = new_user_id AND book_id = new_book_id;

    RAISE NOTICE 'Delete operations complete.';

    -- Clean up our dummy entities to ensure idempotency
    DELETE FROM public.user_shelves WHERE user_id = new_user_id;
    DELETE FROM public.books WHERE id = new_book_id;
    DELETE FROM public.users WHERE id = new_user_id;

    RAISE NOTICE 'DBMS Demonstration completed successfully (Idempotent execution).';
END $$;

-- 6. JOINS (Inner Join)
SELECT b.title, g.name as genre_name
FROM public.books b
JOIN public.genres g ON b.genre_id = g.id
LIMIT 5;

-- 7. AGGREGATE QUERIES (Group By & Having)
SELECT book_id, AVG(rating) as avg_rating, COUNT(*) as total_reviews
FROM public.reviews
GROUP BY book_id
HAVING AVG(rating) > 4.0
LIMIT 5;

-- 8. VIEWS
SELECT * FROM public.book_details_view LIMIT 5;

-- 9. EXPLICIT TRANSACTIONS
-- Demonstrate an explicit transaction with ROLLBACK to show atomicity 
BEGIN;
    INSERT INTO public.authors (id, name) VALUES (gen_random_uuid(), 'Atomicity Tester');
ROLLBACK;
