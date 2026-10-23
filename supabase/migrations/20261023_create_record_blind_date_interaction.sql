-- Migration: Create record_blind_date_interaction() stored procedure
-- Consumes the reader session's active mystery match and records their accept/pass choice.

CREATE OR REPLACE FUNCTION public.record_blind_date_interaction(
    p_session_id TEXT,
    p_book_id UUID,
    p_accepted BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_blind_date_interaction(TEXT, UUID, BOOLEAN)
  TO authenticated, service_role;
