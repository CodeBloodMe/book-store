-- Add fiction_genres array to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS fiction_genres text[] DEFAULT '{}';

-- Create a GIN index to make the array intersection queries ultra fast
CREATE INDEX IF NOT EXISTS idx_books_fiction_genres ON books USING gin(fiction_genres);
