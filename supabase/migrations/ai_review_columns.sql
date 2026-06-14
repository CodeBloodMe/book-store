-- Add AI Aggregator fields to the books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS ai_review_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_pros TEXT[],
ADD COLUMN IF NOT EXISTS ai_cons TEXT[],
ADD COLUMN IF NOT EXISTS ai_rating DECIMAL(3,2) CHECK (ai_rating BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS ai_last_updated TIMESTAMPTZ;
