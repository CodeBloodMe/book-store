-- Add free_reading_url column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS free_reading_url VARCHAR(1000);

-- Create a storage bucket for free epub books if it doesn't exist
-- Note: Supabase storage buckets require the storage schema
INSERT INTO storage.buckets (id, name, public) 
VALUES ('free-books', 'free-books', true)
ON CONFLICT (id) DO NOTHING;

-- Set up basic public access policies for the free-books bucket
CREATE POLICY "Public Access for Free Books"
ON storage.objects FOR SELECT
USING ( bucket_id = 'free-books' );

-- Allow the service role to insert books (for our backend auto-fetcher)
CREATE POLICY "Service Role Upload Free Books"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'free-books' );
