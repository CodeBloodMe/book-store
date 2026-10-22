-- Run only after sql/03_add_missing_book_foreign_keys.sql committed successfully.
-- Validation checks all existing rows against the new FK constraints.
ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_book_id_fkey;
ALTER TABLE public.user_shelves VALIDATE CONSTRAINT user_shelves_book_id_fkey;

-- Verify final FK definitions
SELECT con.conrelid::regclass AS source_table,
       con.conname,
       pg_get_constraintdef(con.oid, true) AS definition,
       con.convalidated AS validated
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.conrelid IN ('public.reviews'::regclass, 'public.user_shelves'::regclass)
ORDER BY source_table, con.conname;
