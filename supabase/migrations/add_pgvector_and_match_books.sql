-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Add an embedding column to the books table
-- We use 768 dimensions because Google's text-embedding-004 model generates 768-dimensional vectors.
alter table public.books add column if not exists embedding vector(768);

-- 3. Create an index for faster similarity searches using Hierarchical Navigable Small World (HNSW)
-- Note: You need enough rows to build the index efficiently, but we can define it anyway.
-- Using vector_cosine_ops since cosine similarity is standard for text embeddings.
create index if not exists books_embedding_idx on public.books using hnsw (embedding vector_cosine_ops);

-- 4. Create an RPC (Remote Procedure Call) function so we can search via Supabase Client
-- This function takes a query_embedding, matches it against all books, 
-- and returns the closest ones, filtering out anything below the match_threshold.
create or replace function match_books(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  author text,
  cover_image_url text,
  description text,
  expert_rating numeric,
  community_rating numeric,
  similarity float
)
language sql stable
as $$
  select
    books.id,
    books.title,
    books.author,
    books.cover_image_url,
    books.description,
    books.expert_rating,
    books.community_rating,
    1 - (books.embedding <=> query_embedding) as similarity
  from books
  where books.embedding is not null
  and 1 - (books.embedding <=> query_embedding) > match_threshold
  order by books.embedding <=> query_embedding
  limit match_count;
$$;
