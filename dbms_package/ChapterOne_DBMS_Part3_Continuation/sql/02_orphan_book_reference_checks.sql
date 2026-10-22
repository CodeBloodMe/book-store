-- ChapterOne: read-only checks before adding missing book foreign keys.
-- Both result sets should be empty. Do NOT apply FK remediation until you inspect them.

-- A. Reviews that reference a book ID absent from public.books
SELECT r.id AS review_id, r.book_id
FROM public.reviews AS r
LEFT JOIN public.books AS b ON b.id = r.book_id
WHERE b.id IS NULL;

-- B. User shelf entries that reference a book ID absent from public.books
SELECT s.id AS shelf_id, s.book_id
FROM public.user_shelves AS s
LEFT JOIN public.books AS b ON b.id = s.book_id
WHERE b.id IS NULL;

-- Counts, for concise evidence capture
SELECT 'reviews' AS source_table, COUNT(*) AS orphan_count
FROM public.reviews r
LEFT JOIN public.books b ON b.id = r.book_id
WHERE b.id IS NULL
UNION ALL
SELECT 'user_shelves', COUNT(*)
FROM public.user_shelves s
LEFT JOIN public.books b ON b.id = s.book_id
WHERE b.id IS NULL;
