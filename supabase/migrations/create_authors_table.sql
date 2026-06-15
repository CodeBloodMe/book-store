-- Create Authors table to store AI-generated biographies and metadata
CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  ai_bio TEXT,
  ai_style TEXT[],
  ai_last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We are keeping the "author" string column on the "books" table
-- for simplicity, and will query authors by matching "name" to "author".
