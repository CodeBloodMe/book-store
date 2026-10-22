-- ChapterOne: guarded remediation for missing books FKs
-- Only run AFTER:
--   1. You have a verified backup.
--   2. sql/02_orphan_book_reference_checks.sql reports 0 orphans for both tables.
-- The DO block independently checks again and aborts if orphan rows exist.
-- NOT VALID avoids a full existing-row scan while adding the constraint, but immediately
-- enforces the FK for new/updated rows. Run 04_validate_book_foreign_keys.sql afterward.

BEGIN;
DO $$
DECLARE
    review_orphans bigint;
    shelf_orphans bigint;
BEGIN
    SELECT COUNT(*) INTO review_orphans
    FROM public.reviews r LEFT JOIN public.books b ON b.id = r.book_id
    WHERE b.id IS NULL;

    SELECT COUNT(*) INTO shelf_orphans
    FROM public.user_shelves s LEFT JOIN public.books b ON b.id = s.book_id
    WHERE b.id IS NULL;

    IF review_orphans <> 0 OR shelf_orphans <> 0 THEN
        RAISE EXCEPTION
          'Aborting FK repair: review orphans=%, shelf orphans=%. Resolve orphan rows and retry.',
          review_orphans, shelf_orphans;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.reviews'::regclass
          AND conname = 'reviews_book_id_fkey'
    ) THEN
        ALTER TABLE public.reviews
          ADD CONSTRAINT reviews_book_id_fkey
          FOREIGN KEY (book_id) REFERENCES public.books(id)
          ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_shelves'::regclass
          AND conname = 'user_shelves_book_id_fkey'
    ) THEN
        ALTER TABLE public.user_shelves
          ADD CONSTRAINT user_shelves_book_id_fkey
          FOREIGN KEY (book_id) REFERENCES public.books(id)
          ON DELETE CASCADE NOT VALID;
    END IF;
END $$;
COMMIT;
