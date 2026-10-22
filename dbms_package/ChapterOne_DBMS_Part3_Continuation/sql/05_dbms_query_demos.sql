-- ChapterOne assessment query demonstrations (read-only except the demo record block below).

-- 1. Join across the hierarchy
SELECT b.id, b.title, b.author, g.name AS genre, sc.name AS super_category
FROM public.books b
JOIN public.genres g ON g.id = b.genre_id
JOIN public.super_categories sc ON sc.id = g.super_category_id
ORDER BY sc.name, g.name, b.title
LIMIT 30;

-- 2. LEFT JOIN and aggregation; books with no reviews remain in the result
SELECT b.id, b.title,
       ROUND(COALESCE(AVG(r.rating), 0)::numeric, 2) AS average_rating,
       COUNT(r.id) AS review_count
FROM public.books b
LEFT JOIN public.reviews r ON r.book_id = b.id
GROUP BY b.id, b.title
ORDER BY review_count DESC, b.title
LIMIT 30;

-- 3. Aggregate by genre
SELECT g.name AS genre, COUNT(b.id) AS book_count
FROM public.genres g
LEFT JOIN public.books b ON b.genre_id = g.id
GROUP BY g.id, g.name
ORDER BY book_count DESC, g.name;

-- 4. Existing summary view
SELECT book_id, title, average_rating, review_count
FROM public.book_details_view
ORDER BY average_rating DESC, review_count DESC
LIMIT 30;

-- 5. Filter and sort
SELECT id, title, author, page_count, published_year
FROM public.books
WHERE page_count BETWEEN 100 AND 400
ORDER BY title, id
LIMIT 20;

-- 6. Pagination: page 2 for pageSize=10 (stable tie-breaker is id)
SELECT id, title, author
FROM public.books
ORDER BY title, id
LIMIT 10 OFFSET 10;

-- 7. Query-plan evidence: run on representative data and save the plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM public.books
WHERE genre_id = (SELECT id FROM public.genres ORDER BY name LIMIT 1);

-- 8. Safe transaction demonstration using a known stable key.
-- First ensure the reserved external_id below is not an existing real book.
-- This example is reversible. The transaction rolls back the update.
BEGIN;
UPDATE public.books
SET page_count = COALESCE(page_count, 0) + 1
WHERE external_id = 'dbms-demo:chapterone-001';
SELECT id, title, page_count
FROM public.books
WHERE external_id = 'dbms-demo:chapterone-001';
ROLLBACK;
-- If the demo row does not exist, UPDATE affects 0 rows. Create a separate demo record first if needed.
