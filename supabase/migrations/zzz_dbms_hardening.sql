-- ChapterOne / Book Store: DBMS hardening migration
-- Apply only after backing up the database and checking the preflight report in
-- docs/DBMS_SUBMISSION_GUIDE.md. Designed for this Supabase-backed schema.
-- Keep the service-role key server-side only; never place it in NEXT_PUBLIC_*.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Keep the application role/profile table aligned with Supabase Auth.
-- auth.users is Supabase's authentication store; public.users is the application's
-- single role/profile table. User-editable endpoints must never assign roles.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_public_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Remove the application profile when the Auth identity is deleted.
        -- The explicit application FKs cascade shelves and anonymize reviews.
        DELETE FROM public.users WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    INSERT INTO public.users (id, email)
    VALUES (NEW.id, COALESCE(NEW.email, NEW.id::text || '@no-email.invalid'))
    ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_user_from_auth ON auth.users;
CREATE TRIGGER trg_sync_public_user_from_auth
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_public_user_from_auth();

-- Backfill before re-pointing app-table foreign keys.
INSERT INTO public.users (id, email)
SELECT id, COALESCE(email, id::text || '@no-email.invalid')
FROM auth.users
ON CONFLICT (id) DO UPDATE
   SET email = EXCLUDED.email,
       updated_at = NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.users
        GROUP BY email HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate public.users.email values must be resolved before adding the unique index';
    END IF;
END;
$$;
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'User';
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (email);

-- Make public.users the FK target for application-owned records. The actual
-- auth.users table remains the authentication provider's identity store.
DO $$
DECLARE fk RECORD;
BEGIN
    FOR fk IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid = 'public.user_shelves'::regclass
          AND c.confrelid = 'auth.users'::regclass
          AND c.conkey = ARRAY[(
              SELECT a.attnum FROM pg_attribute a
              WHERE a.attrelid = 'public.user_shelves'::regclass
                AND a.attname = 'user_id' AND NOT a.attisdropped
          )]::smallint[]
    LOOP
        EXECUTE format('ALTER TABLE public.user_shelves DROP CONSTRAINT %I', fk.conname);
    END LOOP;

    FOR fk IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid = 'public.reviews'::regclass
          AND c.confrelid = 'auth.users'::regclass
          AND c.conkey = ARRAY[(
              SELECT a.attnum FROM pg_attribute a
              WHERE a.attrelid = 'public.reviews'::regclass
                AND a.attname = 'user_id' AND NOT a.attisdropped
          )]::smallint[]
    LOOP
        EXECUTE format('ALTER TABLE public.reviews DROP CONSTRAINT %I', fk.conname);
    END LOOP;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_shelves'::regclass
          AND conname = 'user_shelves_user_id_public_users_fkey'
    ) THEN
        ALTER TABLE public.user_shelves
          ADD CONSTRAINT user_shelves_user_id_public_users_fkey
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.reviews'::regclass
          AND conname = 'reviews_user_id_public_users_fkey'
    ) THEN
        ALTER TABLE public.reviews
          ADD CONSTRAINT reviews_user_id_public_users_fkey
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.user_shelves VALIDATE CONSTRAINT user_shelves_user_id_public_users_fkey;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_user_id_public_users_fkey;

-- Ensure profile fields exist even if an earlier manual schema predated the
-- assessment migration. Supabase Auth remains the source of identity.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS email VARCHAR,
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'User',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname = 'users_role_allowed_ck') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_role_allowed_ck
          CHECK (role IN ('Admin', 'User', 'Faculty', 'Student')) NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.users VALIDATE CONSTRAINT users_role_allowed_ck;

-- Role changes are privileged operations. Authenticated users may read their own
-- profile, but cannot insert/update role values or directly delete the profile.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', p.policyname);
    END LOOP;
END;
$$;
CREATE POLICY users_select_own_profile
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;

-- -----------------------------------------------------------------------------
-- 1A. Public catalog data is read-only to browser roles. All catalog mutations
-- go through validated server routes/admin workflows; authenticated users cannot
-- write to globally shared book, author, genre, category, or graph records.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    target_table TEXT;
    p RECORD;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['books', 'authors', 'genres', 'super_categories', 'book_edges']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
        FOR p IN SELECT policyname FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = target_table
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, target_table);
        END LOOP;
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
            target_table || '_public_read', target_table
        );
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', target_table);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', target_table);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', target_table);
    END LOOP;
END;
$$;

-- Make the core relational links explicit in the database (not just the ORM).
-- Existing correctly named constraints are preserved; the companion preflight
-- catches orphan rows before these constraints are validated.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_book_id_fkey') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_book_id_fkey
          FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_shelves'::regclass AND conname = 'user_shelves_book_id_fkey') THEN
        ALTER TABLE public.user_shelves ADD CONSTRAINT user_shelves_book_id_fkey
          FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_genre_id_fkey') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_genre_id_fkey
          FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.genres'::regclass AND conname = 'genres_super_category_id_fkey') THEN
        ALTER TABLE public.genres ADD CONSTRAINT genres_super_category_id_fkey
          FOREIGN KEY (super_category_id) REFERENCES public.super_categories(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.book_edges'::regclass AND conname = 'book_edges_book_a_id_fkey') THEN
        ALTER TABLE public.book_edges ADD CONSTRAINT book_edges_book_a_id_fkey
          FOREIGN KEY (book_a_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.book_edges'::regclass AND conname = 'book_edges_book_b_id_fkey') THEN
        ALTER TABLE public.book_edges ADD CONSTRAINT book_edges_book_b_id_fkey
          FOREIGN KEY (book_b_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.blind_date_interactions'::regclass AND conname = 'blind_date_interactions_book_id_fkey') THEN
        ALTER TABLE public.blind_date_interactions ADD CONSTRAINT blind_date_interactions_book_id_fkey
          FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_book_id_fkey;
ALTER TABLE public.user_shelves VALIDATE CONSTRAINT user_shelves_book_id_fkey;
ALTER TABLE public.books VALIDATE CONSTRAINT books_genre_id_fkey;
ALTER TABLE public.genres VALIDATE CONSTRAINT genres_super_category_id_fkey;
ALTER TABLE public.books ALTER COLUMN genre_id SET NOT NULL;
ALTER TABLE public.genres ALTER COLUMN super_category_id SET NOT NULL;
ALTER TABLE public.book_edges VALIDATE CONSTRAINT book_edges_book_a_id_fkey;
ALTER TABLE public.book_edges VALIDATE CONSTRAINT book_edges_book_b_id_fkey;
ALTER TABLE public.blind_date_interactions VALIDATE CONSTRAINT blind_date_interactions_book_id_fkey;

-- Use a native unique index for idempotent external catalog imports.
-- The preflight script reports duplicate non-null external IDs before applying.
CREATE UNIQUE INDEX IF NOT EXISTS books_external_id_key ON public.books (external_id);

-- -----------------------------------------------------------------------------
-- 2. Review authorization. Public reading and anonymous review submission are
-- product features; editing/deleting a named authenticated review is owner-only.
-- -----------------------------------------------------------------------------

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'reviews'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', p.policyname);
    END LOOP;
END;
$$;

CREATE POLICY reviews_public_read
ON public.reviews FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY reviews_anonymous_insert
ON public.reviews FOR INSERT TO anon
WITH CHECK (
    user_id IS NULL
    AND char_length(btrim(reviewer_name)) BETWEEN 2 AND 80
    AND char_length(btrim(content)) BETWEEN 10 AND 5000
    AND rating BETWEEN 1 AND 5
);

CREATE POLICY reviews_authenticated_insert_own
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND char_length(btrim(reviewer_name)) BETWEEN 2 AND 80
    AND char_length(btrim(content)) BETWEEN 10 AND 5000
    AND rating BETWEEN 1 AND 5
);

CREATE POLICY reviews_authenticated_update_own
ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_authenticated_delete_own
ON public.reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_rating_range_ck') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range_ck CHECK (rating BETWEEN 1 AND 5) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_reviewer_name_length_ck') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_name_length_ck CHECK (char_length(btrim(reviewer_name)) BETWEEN 2 AND 80) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_content_length_ck') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_content_length_ck CHECK (char_length(btrim(content)) BETWEEN 10 AND 5000) NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_rating_range_ck;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_reviewer_name_length_ck;
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_content_length_ck;

-- -----------------------------------------------------------------------------
-- 3. Shelf ownership policies. The unique pair (user_id, book_id) remains the
-- concurrency-safe upsert key; PostgreSQL enforces it below the application.
-- -----------------------------------------------------------------------------

ALTER TABLE public.user_shelves ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'user_shelves'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_shelves', p.policyname);
    END LOOP;
END;
$$;

CREATE POLICY shelves_select_own
ON public.user_shelves FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY shelves_insert_own
ON public.user_shelves FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY shelves_update_own
ON public.user_shelves FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY shelves_delete_own
ON public.user_shelves FOR DELETE TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.user_shelves FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_shelves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_shelves TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_shelves'::regclass AND conname = 'user_shelves_status_ck') THEN
        ALTER TABLE public.user_shelves ADD CONSTRAINT user_shelves_status_ck
          CHECK (status IN ('want_to_read', 'reading', 'read')) NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.user_shelves VALIDATE CONSTRAINT user_shelves_status_ck;

-- -----------------------------------------------------------------------------
-- 4. Keep blind-date sessions private. Next.js server routes use the server-only
-- service-role client after validating input; browser/anon keys get no table or
-- matching-RPC access. Do not ship the service-role key to the browser.
-- -----------------------------------------------------------------------------

ALTER TABLE public.user_reader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_date_interactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_reader_profiles
    ADD COLUMN IF NOT EXISTS last_matched_book_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_reader_profiles'::regclass
          AND conname = 'user_reader_profiles_last_match_fkey'
    ) THEN
        ALTER TABLE public.user_reader_profiles
          ADD CONSTRAINT user_reader_profiles_last_match_fkey
          FOREIGN KEY (last_matched_book_id) REFERENCES public.books(id)
          ON DELETE SET NULL NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.user_reader_profiles
  VALIDATE CONSTRAINT user_reader_profiles_last_match_fkey;

DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT policyname, tablename FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename IN ('user_reader_profiles', 'blind_date_interactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
    END LOOP;
END;
$$;

REVOKE ALL ON TABLE public.user_reader_profiles, public.blind_date_interactions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_reader_profiles,
  public.blind_date_interactions TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Enforce basic catalog domain integrity before maintaining derived metrics.
-- Legacy invalid rows fail the migration intentionally; inspect the preflight report.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_page_count_positive_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_page_count_positive_ck
          CHECK (page_count IS NULL OR page_count > 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_series_number_positive_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_series_number_positive_ck
          CHECK (series_number IS NULL OR series_number > 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_expert_rating_range_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_expert_rating_range_ck
          CHECK (expert_rating IS NULL OR expert_rating BETWEEN 0 AND 5) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_community_rating_range_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_community_rating_range_ck
          CHECK (community_rating IS NULL OR community_rating BETWEEN 0 AND 5) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_ai_rating_range_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_ai_rating_range_ck
          CHECK (ai_rating IS NULL OR ai_rating BETWEEN 0 AND 5) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.books'::regclass AND conname = 'books_total_reviews_nonnegative_ck') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_total_reviews_nonnegative_ck
          CHECK (total_reviews IS NULL OR total_reviews >= 0) NOT VALID;
    END IF;
END;
$$;
ALTER TABLE public.books VALIDATE CONSTRAINT books_page_count_positive_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_series_number_positive_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_expert_rating_range_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_community_rating_range_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_ai_rating_range_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_total_reviews_nonnegative_ck;

-- -----------------------------------------------------------------------------
-- 6. Preserve imported/community ratings. Maintain separate user-review summary
-- columns transactionally; never overwrite books.community_rating (external data).
-- -----------------------------------------------------------------------------

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS user_review_average NUMERIC(3,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS user_review_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.books'::regclass
          AND conname = 'books_user_review_average_range_ck'
    ) THEN
        ALTER TABLE public.books
          ADD CONSTRAINT books_user_review_average_range_ck
          CHECK (user_review_average BETWEEN 0 AND 5) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.books'::regclass
          AND conname = 'books_user_review_count_nonnegative_ck'
    ) THEN
        ALTER TABLE public.books
          ADD CONSTRAINT books_user_review_count_nonnegative_ck
          CHECK (user_review_count >= 0) NOT VALID;
    END IF;
END;
$$;

-- Backfill summaries without touching source/community ratings.
UPDATE public.books b
SET user_review_average = COALESCE(s.avg_rating, 0)::NUMERIC(3,2),
    user_review_count = COALESCE(s.review_count, 0)
FROM (
    SELECT b2.id,
           AVG(r.rating)::NUMERIC AS avg_rating,
           COUNT(r.id)::INTEGER AS review_count
    FROM public.books b2
    LEFT JOIN public.reviews r ON r.book_id = b2.id
    GROUP BY b2.id
) s
WHERE b.id = s.id;

ALTER TABLE public.books VALIDATE CONSTRAINT books_user_review_average_range_ck;
ALTER TABLE public.books VALIDATE CONSTRAINT books_user_review_count_nonnegative_ck;

CREATE OR REPLACE FUNCTION public.recalculate_user_review_summary(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Serialize aggregate recomputations without upgrading the FK row lock
    -- held by a concurrent review INSERT. Under READ COMMITTED, the aggregate
    -- statement after this transaction-scoped lock sees earlier committed writes.
    PERFORM pg_advisory_xact_lock(hashtext(p_book_id::text), 19491);
    IF NOT EXISTS (SELECT 1 FROM public.books WHERE id = p_book_id) THEN
        RETURN;
    END IF;

    UPDATE public.books b
       SET user_review_average = COALESCE(s.avg_rating, 0)::NUMERIC(3,2),
           user_review_count = COALESCE(s.review_count, 0),
           updated_at = NOW()
      FROM (
          SELECT p_book_id AS id,
                 AVG(r.rating)::NUMERIC AS avg_rating,
                 COUNT(r.id)::INTEGER AS review_count
          FROM public.reviews r
          WHERE r.book_id = p_book_id
      ) s
     WHERE b.id = s.id
       AND (b.user_review_average IS DISTINCT FROM COALESCE(s.avg_rating, 0)::NUMERIC(3,2)
         OR b.user_review_count IS DISTINCT FROM s.review_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_review_summary_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_user_review_summary(OLD.book_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.book_id IS DISTINCT FROM NEW.book_id THEN
            -- Lock/recalculate both affected books in UUID order to reduce deadlocks
            -- if two transactions move reviews between the same pair of books.
            IF OLD.book_id < NEW.book_id THEN
                PERFORM public.recalculate_user_review_summary(OLD.book_id);
                PERFORM public.recalculate_user_review_summary(NEW.book_id);
            ELSE
                PERFORM public.recalculate_user_review_summary(NEW.book_id);
                PERFORM public.recalculate_user_review_summary(OLD.book_id);
            END IF;
        ELSE
            PERFORM public.recalculate_user_review_summary(NEW.book_id);
        END IF;
        RETURN NEW;
    ELSE
        PERFORM public.recalculate_user_review_summary(NEW.book_id);
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_review_summary ON public.reviews;
CREATE TRIGGER trg_sync_user_review_summary
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_user_review_summary_from_review();

-- A real PostgreSQL PROCEDURE for maintenance/reconciliation and DBMS assessment.
CREATE OR REPLACE PROCEDURE public.refresh_user_review_summaries()
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_book_id UUID;
BEGIN
    -- Lock aggregate keys in a stable order. If a concurrent review trigger is
    -- already recalculating a book, wait for it; a writer arriving later waits
    -- on this procedure's advisory lock and recalculates after this transaction.
    FOR v_book_id IN SELECT id FROM public.books ORDER BY id LOOP
        PERFORM pg_advisory_xact_lock(hashtext(v_book_id::text), 19491);
    END LOOP;

    UPDATE public.books b
       SET user_review_average = COALESCE(s.avg_rating, 0)::NUMERIC(3,2),
           user_review_count = COALESCE(s.review_count, 0),
           updated_at = NOW()
      FROM (
          SELECT b2.id,
                 AVG(r.rating)::NUMERIC AS avg_rating,
                 COUNT(r.id)::INTEGER AS review_count
          FROM public.books b2
          LEFT JOIN public.reviews r ON r.book_id = b2.id
          GROUP BY b2.id
      ) s
     WHERE b.id = s.id
       AND (b.user_review_average IS DISTINCT FROM COALESCE(s.avg_rating, 0)::NUMERIC(3,2)
         OR b.user_review_count IS DISTINCT FROM s.review_count);
END;
$$;

-- Update the reporting view only after the summary columns exist. Keep the
-- same public column names as the earlier DBMS requirements migration.
CREATE OR REPLACE VIEW public.book_details_view
WITH (security_invoker = true)
AS
SELECT b.id AS book_id,
       b.title,
       COALESCE(AVG(r.rating), 0)::NUMERIC AS average_rating,
       COUNT(r.id)::BIGINT AS review_count
FROM public.books b
LEFT JOIN public.reviews r ON r.book_id = b.id
GROUP BY b.id, b.title;
REVOKE ALL ON TABLE public.book_details_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.book_details_view TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.recalculate_user_review_summary(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.sync_user_review_summary_from_review()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON PROCEDURE public.refresh_user_review_summaries()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON PROCEDURE public.refresh_user_review_summaries() TO service_role;

-- -----------------------------------------------------------------------------
-- 7. Keep graph edges mathematically valid and add workload-aligned indexes.
-- NOT VALID makes the constraint enforce new writes immediately; pre-existing
-- rows are audited in the accompanying acceptance-check script before validation.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.book_edges'::regclass
          AND conname = 'book_edges_weight_nonnegative_ck'
    ) THEN
        ALTER TABLE public.book_edges
          ADD CONSTRAINT book_edges_weight_nonnegative_ck
          CHECK (weight >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.book_edges'::regclass
          AND conname = 'book_edges_similarity_range_ck'
    ) THEN
        ALTER TABLE public.book_edges
          ADD CONSTRAINT book_edges_similarity_range_ck
          CHECK (similarity_score IS NULL OR similarity_score BETWEEN 0 AND 1) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.book_edges'::regclass
          AND conname = 'book_edges_relationship_type_nonempty_ck'
    ) THEN
        ALTER TABLE public.book_edges
          ADD CONSTRAINT book_edges_relationship_type_nonempty_ck
          CHECK (char_length(btrim(relationship_type)) BETWEEN 1 AND 50) NOT VALID;
    END IF;
END;
$$;

-- Validate legacy rows as well as enforcing these checks on all new writes. Run
-- the edge diagnostics in the acceptance script first; fix any bad rows rather
-- than silently rewriting graph semantics.
ALTER TABLE public.book_edges VALIDATE CONSTRAINT book_edges_weight_nonnegative_ck;
ALTER TABLE public.book_edges VALIDATE CONSTRAINT book_edges_similarity_range_ck;
ALTER TABLE public.book_edges VALIDATE CONSTRAINT book_edges_relationship_type_nonempty_ck;

CREATE INDEX IF NOT EXISTS idx_reviews_book_created_at
    ON public.reviews (book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
    ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_user_shelves_user_status
    ON public.user_shelves (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_shelves_book_id
    ON public.user_shelves (book_id);
CREATE INDEX IF NOT EXISTS idx_books_genre_id
    ON public.books (genre_id);
CREATE INDEX IF NOT EXISTS idx_genres_super_category_id
    ON public.genres (super_category_id);
CREATE INDEX IF NOT EXISTS idx_blind_date_session_book
    ON public.blind_date_interactions (session_id, book_id);
CREATE INDEX IF NOT EXISTS idx_book_edges_type_weight
    ON public.book_edges (relationship_type, weight);

-- -----------------------------------------------------------------------------
-- 8. Harden function resolution and expose only the RPCs each runtime requires.
-- Book catalog/search/graph endpoints are public; blind-date session RPCs are
-- service-role-only because the Next.js API validates requests server-side.
-- -----------------------------------------------------------------------------

ALTER FUNCTION public.match_books(vector, double precision, integer)
    SET search_path = public, pg_temp;
ALTER FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    SET search_path = '';
ALTER FUNCTION public.get_blind_date_stats()
    SET search_path = '';
ALTER FUNCTION public.find_reading_path(UUID, UUID, integer)
    SET search_path = '';
ALTER FUNCTION public.get_book_neighbors(UUID, integer)
    SET search_path = '';
ALTER FUNCTION public.update_updated_at_column()
    SET search_path = '';
ALTER FUNCTION public.sync_public_user_from_auth()
    SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.match_books(vector, double precision, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_books(vector, double precision, integer)
    TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_blind_date_stats()
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_blind_date_stats() TO service_role;

REVOKE EXECUTE ON FUNCTION public.find_reading_path(UUID, UUID, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_reading_path(UUID, UUID, integer)
    TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_book_neighbors(UUID, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_book_neighbors(UUID, integer)
    TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sync_public_user_from_auth()
    FROM PUBLIC, anon, authenticated, service_role;

-- Match + interaction must be one transaction. A stale/guessed book ID cannot be
-- revealed or recorded unless it is the active match stored for that session.
CREATE OR REPLACE FUNCTION public.record_blind_date_interaction(
    p_session_id TEXT,
    p_book_id UUID,
    p_accepted BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.user_reader_profiles
       SET last_matched_book_id = NULL
     WHERE session_id = p_session_id
       AND last_matched_book_id = p_book_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.blind_date_interactions (session_id, book_id, accepted)
    VALUES (p_session_id, p_book_id, p_accepted);

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_blind_date_interaction(TEXT, UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_blind_date_interaction(TEXT, UUID, BOOLEAN)
  TO service_role;

COMMIT;
