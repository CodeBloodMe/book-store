-- PostgreSQL stored-procedure demonstration for the DBMS assessment.
-- Review on a development database first; this script does not run automatically.
-- Example call (replace the UUID with an existing book):
-- CALL public.chapterone_get_book_rating_metrics('00000000-0000-0000-0000-000000000000'::uuid, NULL, NULL, NULL);

CREATE OR REPLACE PROCEDURE public.chapterone_get_book_rating_metrics(
    IN p_book_id uuid,
    OUT book_title text,
    OUT total_reviews bigint,
    OUT avg_rating numeric
)
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    SELECT b.title::text,
           count(r.id)::bigint,
           round(coalesce(avg(r.rating), 0)::numeric, 2)
    INTO book_title, total_reviews, avg_rating
    FROM public.books AS b
    LEFT JOIN public.reviews AS r ON r.book_id = b.id
    WHERE b.id = p_book_id
    GROUP BY b.id, b.title;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book % was not found.', p_book_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- The procedure is read-only and remains owner-executable for a controlled SQL demo.
-- Do not grant EXECUTE to anon/authenticated without a separate access review.
REVOKE ALL ON PROCEDURE public.chapterone_get_book_rating_metrics(uuid)
FROM PUBLIC, anon, authenticated;
