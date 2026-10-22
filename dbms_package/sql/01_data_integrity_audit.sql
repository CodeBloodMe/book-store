-- ChapterOne: read-only data integrity checks
-- A nonzero result count is a signal to investigate, not automatic proof of corruption.

-- 1. Books missing a genre or descriptive values
SELECT COUNT(*) AS books_without_description FROM public.books WHERE description IS NULL OR btrim(description) = '';
SELECT COUNT(*) AS books_without_cover FROM public.books WHERE cover_image_url IS NULL OR btrim(cover_image_url) = '';

-- 2. Out-of-range rating values (expected 0..5 in the current seed schema)
SELECT id, title, expert_rating, community_rating, ai_rating
FROM public.books
WHERE (expert_rating IS NOT NULL AND (expert_rating < 0 OR expert_rating > 5))
   OR (community_rating IS NOT NULL AND (community_rating < 0 OR community_rating > 5))
   OR (ai_rating IS NOT NULL AND (ai_rating < 0 OR ai_rating > 5));

-- 3. Invalid review ratings (expected 1..5)
SELECT id, book_id, rating FROM public.reviews WHERE rating < 1 OR rating > 5;

-- 4. Self-loops in BookWeb
SELECT id, book_a_id, book_b_id FROM public.book_edges WHERE book_a_id = book_b_id;

-- 5. Duplicate undirected graph pairs: detects (A,B) and (B,A) both being stored
SELECT LEAST(book_a_id, book_b_id) AS endpoint_low,
       GREATEST(book_a_id, book_b_id) AS endpoint_high,
       COUNT(*) AS stored_edges,
       array_agg(id) AS edge_ids
FROM public.book_edges
GROUP BY LEAST(book_a_id, book_b_id), GREATEST(book_a_id, book_b_id)
HAVING COUNT(*) > 1;

-- 6. Negative weights (should not be valid for the current shortest-path logic)
SELECT id, book_a_id, book_b_id, weight FROM public.book_edges WHERE weight < 0;

-- 7. Interactions whose session_id has no profile (there is no FK in the current migration)
SELECT bdi.*
FROM public.blind_date_interactions bdi
LEFT JOIN public.user_reader_profiles urp ON urp.session_id = bdi.session_id
WHERE urp.session_id IS NULL;

-- 8. Orphan book references (FKs should ordinarily prevent these)
SELECT be.id FROM public.book_edges be
LEFT JOIN public.books a ON a.id = be.book_a_id
LEFT JOIN public.books b ON b.id = be.book_b_id
WHERE a.id IS NULL OR b.id IS NULL;

-- 9. Duplicated catalog identity for populated external IDs (normally prevented by a unique constraint)
SELECT external_id, COUNT(*) AS copies
FROM public.books
WHERE external_id IS NOT NULL
GROUP BY external_id HAVING COUNT(*) > 1;

-- 10. Count rows in the main project entities
SELECT 'books' AS entity, COUNT(*)::bigint AS row_count FROM public.books
UNION ALL SELECT 'genres', COUNT(*)::bigint FROM public.genres
UNION ALL SELECT 'super_categories', COUNT(*)::bigint FROM public.super_categories
UNION ALL SELECT 'reviews', COUNT(*)::bigint FROM public.reviews
UNION ALL SELECT 'book_edges', COUNT(*)::bigint FROM public.book_edges
UNION ALL SELECT 'user_shelves', COUNT(*)::bigint FROM public.user_shelves
UNION ALL SELECT 'authors', COUNT(*)::bigint FROM public.authors
UNION ALL SELECT 'user_reader_profiles', COUNT(*)::bigint FROM public.user_reader_profiles
UNION ALL SELECT 'blind_date_interactions', COUNT(*)::bigint FROM public.blind_date_interactions
ORDER BY entity;
