-- Migration: Allow public delete access for reviews

-- We already enabled RLS in create_reviews_table.sql.
-- Now we need to add a policy allowing DELETE.

CREATE POLICY "Allow public delete access" ON public.reviews
    FOR DELETE USING (true);
