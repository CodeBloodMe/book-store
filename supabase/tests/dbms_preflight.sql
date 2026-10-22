-- RUN BEFORE applying zzz_dbms_hardening.sql.
-- Read-only diagnostics: each result set should be empty unless noted.
-- Resolve rows returned here deliberately; do not bypass failed constraints by weakening checks.

-- 1. The profile email unique index requires unique public profile emails.
SELECT email, COUNT(*) AS duplicate_count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

SELECT id, email FROM public.users
WHERE email IS NULL OR char_length(btrim(email)) = 0;

-- 2. User role values must be from the faculty-approved project role set.
SELECT id, role FROM public.users
WHERE role NOT IN ('Admin', 'User', 'Faculty', 'Student') OR role IS NULL;

-- Supabase Auth rows will be mirrored into public.users; duplicate e-mail addresses
-- would conflict with the unique profile e-mail index during backfill.
SELECT email, COUNT(*) AS duplicate_count
FROM auth.users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. External catalog imports use external_id for race-safe deduplication.
SELECT external_id, COUNT(*) AS duplicate_count
FROM public.books
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING COUNT(*) > 1;

-- 4. Existing user references are initially expected to point to auth.users.
SELECT s.id, s.user_id
FROM public.user_shelves s
LEFT JOIN auth.users u ON u.id = s.user_id
WHERE u.id IS NULL;

SELECT r.id, r.user_id
FROM public.reviews r
LEFT JOIN auth.users u ON u.id = r.user_id
WHERE r.user_id IS NOT NULL AND u.id IS NULL;

-- 5. Core relational links that the hardening migration validates.
SELECT r.id, r.book_id
FROM public.reviews r LEFT JOIN public.books b ON b.id = r.book_id
WHERE b.id IS NULL;

SELECT s.id, s.book_id
FROM public.user_shelves s LEFT JOIN public.books b ON b.id = s.book_id
WHERE b.id IS NULL;

SELECT b.id, b.genre_id
FROM public.books b LEFT JOIN public.genres g ON g.id = b.genre_id
WHERE b.genre_id IS NULL OR g.id IS NULL;

SELECT g.id, g.super_category_id
FROM public.genres g LEFT JOIN public.super_categories sc ON sc.id = g.super_category_id
WHERE g.super_category_id IS NULL OR sc.id IS NULL;

SELECT e.id, e.book_a_id, e.book_b_id
FROM public.book_edges e
LEFT JOIN public.books a ON a.id = e.book_a_id
LEFT JOIN public.books b ON b.id = e.book_b_id
WHERE a.id IS NULL OR b.id IS NULL;

SELECT i.id, i.book_id
FROM public.blind_date_interactions i LEFT JOIN public.books b ON b.id = i.book_id
WHERE b.id IS NULL;

-- 6. Review constraints to be enforced by the migration.
SELECT id, reviewer_name, rating, char_length(btrim(content)) AS content_length
FROM public.reviews
WHERE rating NOT BETWEEN 1 AND 5
   OR char_length(btrim(reviewer_name)) NOT BETWEEN 2 AND 80
   OR char_length(btrim(content)) NOT BETWEEN 10 AND 5000;

-- 7. Catalog-domain constraints to be enforced by the migration.
SELECT id, title, page_count, series_number, expert_rating, community_rating,
       ai_rating, total_reviews
FROM public.books
WHERE (page_count IS NOT NULL AND page_count <= 0)
   OR (series_number IS NOT NULL AND series_number <= 0)
   OR (expert_rating IS NOT NULL AND expert_rating NOT BETWEEN 0 AND 5)
   OR (community_rating IS NOT NULL AND community_rating NOT BETWEEN 0 AND 5)
   OR (ai_rating IS NOT NULL AND ai_rating NOT BETWEEN 0 AND 5)
   OR (total_reviews IS NOT NULL AND total_reviews < 0);

-- 8. Graph constraints to be enforced by the migration.
SELECT id, book_a_id, book_b_id, weight, similarity_score
FROM public.book_edges
WHERE weight < 0
   OR (similarity_score IS NOT NULL AND similarity_score NOT BETWEEN 0 AND 1)
   OR char_length(btrim(relationship_type)) NOT BETWEEN 1 AND 50;
