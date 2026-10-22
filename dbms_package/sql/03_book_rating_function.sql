-- ChapterOne stored-function demonstration.
-- SECURITY INVOKER (default), fixed search_path, rejects invalid values and missing book IDs.
-- Execution permissions are restricted here to trusted database roles; verify your role names first.
CREATE OR REPLACE FUNCTION public.set_book_expert_rating(p_book_id uuid, p_rating numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_rating IS NULL OR p_rating < 0 OR p_rating > 5 THEN
        RAISE EXCEPTION 'expert rating must be between 0 and 5';
    END IF;

    UPDATE public.books
       SET expert_rating = p_rating,
           updated_at = now()
     WHERE id = p_book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'book % was not found', p_book_id;
    END IF;
END;
$$;

-- Avoid exposing a rating mutation RPC to anonymous clients.
REVOKE ALL ON FUNCTION public.set_book_expert_rating(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_book_expert_rating(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.set_book_expert_rating(uuid, numeric) FROM authenticated;

-- Demonstration in the SQL editor (choose a real ID; do not use arbitrary input):
-- SELECT public.set_book_expert_rating('<existing-book-uuid>'::uuid, 4.25);
-- This function should be called only by a trusted database owner/administrative process unless
-- a reviewed authorization design is added. Do not grant it to public app users as written.
