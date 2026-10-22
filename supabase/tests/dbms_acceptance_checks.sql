-- Run AFTER zzz_dbms_hardening.sql in the Supabase SQL Editor.
-- Run dbms_preflight.sql BEFORE the migration; that file contains pre-change diagnostics.

-- A. Ensure no duplicate user emails before unique constraints are relied upon.
SELECT email, COUNT(*) AS duplicate_count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- B. Referential-integrity diagnostics: each query should return zero rows.

SELECT s.id, s.user_id FROM public.user_shelves s
LEFT JOIN public.users u ON u.id = s.user_id
WHERE u.id IS NULL;

SELECT r.id, r.user_id FROM public.reviews r
LEFT JOIN public.users u ON u.id = r.user_id
WHERE r.user_id IS NOT NULL AND u.id IS NULL;

SELECT r.id, r.book_id FROM public.reviews r
LEFT JOIN public.books b ON b.id = r.book_id
WHERE b.id IS NULL;

SELECT e.id, e.weight, e.similarity_score
FROM public.book_edges e
WHERE e.weight < 0
   OR (e.similarity_score IS NOT NULL AND e.similarity_score NOT BETWEEN 0 AND 1)
   OR char_length(btrim(e.relationship_type)) NOT BETWEEN 1 AND 50;

-- C. Schema evidence for the assessment: primary/foreign keys, check constraints,
-- indexes, row-level security, required view, trigger, function, and procedure.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'books', 'genres', 'reviews', 'user_shelves',
                    'book_edges', 'user_reader_profiles', 'blind_date_interactions')
ORDER BY tablename;

SELECT c.conrelid::regclass AS table_name, c.conname, c.contype, c.convalidated
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.conname IN (
    'users_email_key',
    'users_role_allowed_ck',
    'books_external_id_key',
    'reviews_rating_range_ck',
    'reviews_reviewer_name_length_ck',
    'reviews_content_length_ck',
    'user_shelves_status_ck',
    'books_page_count_positive_ck',
    'books_series_number_positive_ck',
    'books_expert_rating_range_ck',
    'books_community_rating_range_ck',
    'books_ai_rating_range_ck',
    'books_total_reviews_nonnegative_ck',
    'user_shelves_user_id_public_users_fkey',
    'reviews_user_id_public_users_fkey',
    'reviews_book_id_fkey',
    'user_shelves_book_id_fkey',
    'books_genre_id_fkey',
    'genres_super_category_id_fkey',
    'book_edges_book_a_id_fkey',
    'book_edges_book_b_id_fkey',
    'blind_date_interactions_book_id_fkey',
    'user_reader_profiles_last_match_fkey',
    'books_user_review_average_range_ck',
    'books_user_review_count_nonnegative_ck',
    'book_edges_weight_nonnegative_ck',
    'book_edges_similarity_range_ck',
    'book_edges_relationship_type_nonempty_ck'
  )
ORDER BY table_name, c.conname;

SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_reviews_book_created_at', 'idx_reviews_user_id',
                    'idx_user_shelves_user_status', 'idx_user_shelves_book_id',
                    'idx_books_genre_id', 'idx_genres_super_category_id',
                    'idx_blind_date_session_book', 'idx_book_edges_type_weight',
                    'books_embedding_idx')
ORDER BY tablename, indexname;

SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'book_details_view';

SELECT p.proname, p.prokind, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('refresh_user_review_summaries', 'record_blind_date_interaction',
                    'match_books', 'match_mystery_book', 'find_reading_path',
                    'get_book_neighbors', 'get_blind_date_stats')
ORDER BY p.proname;

-- D. Non-destructive functional check. All test data is rolled back.
BEGIN;

CALL public.refresh_user_review_summaries();

DO $$
DECLARE
    v_book_id UUID;
    v_review_id UUID;
    v_marker TEXT := '__DBMS_TEST_' || replace(gen_random_uuid()::text, '-', '') || '__';
    v_count INTEGER;
    v_average NUMERIC(3,2);
    v_expected_count INTEGER;
    v_expected_average NUMERIC(3,2);
BEGIN
    SELECT id INTO v_book_id FROM public.books ORDER BY id LIMIT 1;
    IF v_book_id IS NULL THEN
        RAISE EXCEPTION 'No book rows available; seed a test catalog before running functional checks.';
    END IF;

    INSERT INTO public.reviews (book_id, reviewer_name, rating, content, user_id)
    VALUES (v_book_id, v_marker, 5, 'Temporary DBMS trigger acceptance test.', NULL)
    RETURNING id INTO v_review_id;

    SELECT user_review_count, user_review_average
      INTO v_count, v_average
      FROM public.books WHERE id = v_book_id;

    SELECT COUNT(*)::INTEGER, COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)::NUMERIC(3,2)
      INTO v_expected_count, v_expected_average
      FROM public.reviews WHERE book_id = v_book_id;

    IF v_count <> v_expected_count OR v_average <> v_expected_average THEN
        RAISE EXCEPTION 'Review INSERT trigger mismatch: got count %, average %, expected count %, average %',
            v_count, v_average, v_expected_count, v_expected_average;
    END IF;

    DELETE FROM public.reviews WHERE id = v_review_id;

    SELECT user_review_count, user_review_average
      INTO v_count, v_average
      FROM public.books WHERE id = v_book_id;

    SELECT COUNT(*)::INTEGER, COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)::NUMERIC(3,2)
      INTO v_expected_count, v_expected_average
      FROM public.reviews WHERE book_id = v_book_id;

    IF v_count <> v_expected_count OR v_average <> v_expected_average THEN
        RAISE EXCEPTION 'Review DELETE trigger mismatch: got count %, average %, expected count %, average %',
            v_count, v_average, v_expected_count, v_expected_average;
    END IF;

    RAISE NOTICE 'PASS: procedure and review-summary INSERT/DELETE trigger checks succeeded for book %.', v_book_id;
END;
$$;

ROLLBACK;

-- E. Live ORM endpoint check after starting the Next.js app:
--   GET /api/dbms-demo?page=1&limit=10  -> 200, data[] and meta object
--   GET /api/dbms-demo?page=0&limit=10  -> 400
--   GET /api/dbms-demo?page=1&limit=101 -> 400
-- Also verify in the browser that users can create a shelf, submit a review,
-- read public reviews, and cannot delete another user's review.
