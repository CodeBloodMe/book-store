-- ChapterOne DBMS lab query demonstrations
-- Read the comments before running. The demo book uses a dedicated external_id.

-- A. CREATE (repeatable demo record). Uses the first available genre so no genre slug is assumed.
INSERT INTO public.books
    (genre_id, title, author, description, language, page_count,
     expert_rating, community_rating, total_reviews, external_id,
     is_featured, is_editors_pick, is_bestseller, tags)
SELECT g.id, 'ChapterOne DBMS Demonstration Book', 'ChapterOne Demo Author',
       'Temporary record used to demonstrate database operations.', 'English',
       120, 4.0, 4.0, 0, 'dbms-demo:chapterone-001',
       false, false, false, ARRAY['DBMS_DEMO']::text[]
FROM public.genres g
ORDER BY g.sort_order NULLS LAST, g.name
LIMIT 1
ON CONFLICT (external_id) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now()
RETURNING id, title, external_id;

-- B. READ: retrieve a record by its stable demo identifier
SELECT id, title, author, page_count, expert_rating, external_id
FROM public.books
WHERE external_id = 'dbms-demo:chapterone-001';

-- C. UPDATE: change only the demo row
UPDATE public.books
SET description = 'Updated description for the DBMS CRUD demonstration.',
    page_count = 125,
    updated_at = now()
WHERE external_id = 'dbms-demo:chapterone-001'
RETURNING id, title, description, page_count;

-- D. DELETE: run only after all demonstrations are finished; affects only the dedicated demo record.
-- DELETE FROM public.books WHERE external_id = 'dbms-demo:chapterone-001';

-- E. JOIN: book -> genre -> super-category
SELECT b.id, b.title, b.author, g.name AS genre, sc.name AS super_category
FROM public.books b
JOIN public.genres g ON g.id = b.genre_id
JOIN public.super_categories sc ON sc.id = g.super_category_id
ORDER BY sc.name, g.name, b.title
LIMIT 30;

-- F. LEFT JOIN + aggregate: review statistics per book (books with zero reviews remain visible)
SELECT b.id, b.title,
       ROUND(COALESCE(AVG(r.rating), 0)::numeric, 2) AS average_review_rating,
       COUNT(r.id) AS review_count
FROM public.books b
LEFT JOIN public.reviews r ON r.book_id = b.id
GROUP BY b.id, b.title
ORDER BY review_count DESC, b.title
LIMIT 30;

-- G. Aggregate: number of books per genre
SELECT g.name AS genre, COUNT(b.id) AS book_count
FROM public.genres g
LEFT JOIN public.books b ON b.genre_id = g.id
GROUP BY g.id, g.name
ORDER BY book_count DESC, g.name;

-- H. Aggregate: review count and average rating by source
SELECT COALESCE(source, 'unknown') AS review_source,
       COUNT(*) AS total_reviews,
       ROUND(AVG(rating)::numeric, 2) AS average_rating
FROM public.reviews
GROUP BY COALESCE(source, 'unknown')
ORDER BY total_reviews DESC;

-- I. VIEW: view object is created by the existing 9999_dbms_requirements.sql migration
SELECT book_id, title, average_rating, review_count
FROM public.book_details_view
ORDER BY average_rating DESC, review_count DESC
LIMIT 30;

-- J. Filtering and sorting
SELECT id, title, author, page_count, published_year
FROM public.books
WHERE page_count BETWEEN 100 AND 400
  AND (title ILIKE '%python%' OR author ILIKE '%python%')
ORDER BY title ASC
LIMIT 20;

-- K. Pagination: page 2 when each page contains 10 rows
SELECT id, title, author
FROM public.books
ORDER BY title, id
LIMIT 10 OFFSET 10;

-- L. Index-assisted plan inspection; compare the plan before/after any index changes.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM public.books WHERE genre_id = (SELECT id FROM public.genres ORDER BY name LIMIT 1);

-- M. Transaction demonstration (no lasting change). Run after the demo INSERT above.
BEGIN;
UPDATE public.books
SET page_count = COALESCE(page_count, 0) + 1, updated_at = now()
WHERE external_id = 'dbms-demo:chapterone-001';
SELECT id, title, page_count FROM public.books WHERE external_id = 'dbms-demo:chapterone-001';
ROLLBACK;
-- After ROLLBACK, page_count returns to its pre-transaction value.
