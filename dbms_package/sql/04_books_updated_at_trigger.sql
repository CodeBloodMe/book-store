-- ChapterOne trigger demonstration: keep books.updated_at current on UPDATE.
-- This script is idempotent for the trigger name below and does not change existing rows.
CREATE OR REPLACE FUNCTION public.chapterone_set_books_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chapterone_books_updated_at ON public.books;
CREATE TRIGGER chapterone_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.chapterone_set_books_updated_at();

-- Verify the trigger from the schema audit query, then update the dedicated demo row to test it.
-- UPDATE public.books SET title = title WHERE external_id = 'dbms-demo:chapterone-001';
