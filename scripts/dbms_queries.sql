-- ======================================================================================
-- DBMS Lab Project Demonstrations (Easily Removable / Academic Purpose Only)
-- ======================================================================================
-- This script demonstrates CRUD operations using explicit transactions and ROLLBACK.
-- It is designed to be fully idempotent and safe to run multiple times without leaving
-- junk data in the production database.

BEGIN;

DO $$
DECLARE
    test_user_id UUID;
    new_book_id UUID := gen_random_uuid();
    new_review_id UUID := gen_random_uuid();
    selected_title TEXT;
BEGIN
    RAISE NOTICE 'Starting DBMS CRUD Demonstration...';

    -- Grab an existing user to satisfy auth.users foreign key constraints safely
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users exist. Skipping INSERT demonstrations that require a user_id.';
    ELSE
        -- 1. CREATE (Insert)
        INSERT INTO public.books (id, title, page_count)
        VALUES (new_book_id, 'The DBMS Assessment Guide', 150);

        INSERT INTO public.reviews (id, user_id, book_id, rating, content, reviewer_name)
        VALUES (new_review_id, test_user_id, new_book_id, 4, 'Good, but needs more normal forms.', 'Test Reviewer');

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

        -- 4. Soft Delete equivalent (Status Update on shelves)
        -- Valid statuses for check constraint: 'want_to_read', 'reading', 'read'
        INSERT INTO public.user_shelves (id, user_id, book_id, status)
        VALUES (gen_random_uuid(), test_user_id, new_book_id, 'want_to_read');
        
        UPDATE public.user_shelves
        SET status = 'read'
        WHERE user_id = test_user_id AND book_id = new_book_id;

        -- 5. DELETE (Hard Delete)
        DELETE FROM public.reviews 
        WHERE id = new_review_id;

        RAISE NOTICE 'Delete operations complete.';
    END IF;

    RAISE NOTICE 'DBMS Demonstration completed successfully.';
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

-- 9. ROLLBACK to ensure idempotency and prevent test data from leaking into the live database
ROLLBACK;
