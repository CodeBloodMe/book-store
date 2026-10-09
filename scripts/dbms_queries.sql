-- ======================================================================================
-- DBMS Lab Project Demonstrations (Easily Removable / Academic Purpose Only)
-- ======================================================================================

-- 1. CREATE (Insert)
INSERT INTO public.reviews (id, user_id, book_id, rating, content)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000', -- Example UUID
    '11111111-1111-1111-1111-111111111111', -- Example UUID
    5,
    'An absolute masterpiece.'
);

-- 2. READ (Select with Filtering)
SELECT title, page_count 
FROM public.books 
WHERE page_count > 300 
ORDER BY title ASC;

-- 3. UPDATE
UPDATE public.reviews 
SET content = 'An absolute masterpiece. Highly recommended!' 
WHERE rating = 5;

-- 4. DELETE
DELETE FROM public.reviews 
WHERE rating < 2;

-- 5. JOINS (Inner Join)
-- Fetching books alongside their respective genres
SELECT b.title, g.name as genre_name
FROM public.books b
JOIN public.genres g ON b.genre_id = g.id;

-- 6. AGGREGATE QUERIES (Group By & Having)
-- Find the average rating per book where the average is greater than 4.0
SELECT book_id, AVG(rating) as avg_rating, COUNT(*) as total_reviews
FROM public.reviews
GROUP BY book_id
HAVING AVG(rating) > 4.0;

-- 7. VIEWS
-- Select from the view created in 9999_dbms_requirements.sql
SELECT * FROM public.book_details_view LIMIT 10;

-- 8. TRANSACTIONS
-- Demonstrate a transaction ensuring atomicity across multiple inserts
BEGIN;
    INSERT INTO public.authors (id, name) VALUES ('22222222-2222-2222-2222-222222222222', 'Test Author');
    INSERT INTO public.books (id, title, page_count) VALUES ('33333333-3333-3333-3333-333333333333', 'Test Book', 100);
COMMIT;
-- ROLLBACK; would be used here in case of failure

-- 9. TRIGGERS & STORED PROCEDURES (Demonstration Call)
-- Our trigger update_users_modtime automatically runs on UPDATE to the users table.
UPDATE public.users SET email = 'new_email@example.com' WHERE email = 'old_email@example.com';

-- Calling the custom RPC vector search function (Stored Procedure)
-- SELECT * FROM match_books('[0.1, 0.2, 0.3...]'::vector, 5, 0.7);
