# ChapterOne relational schema (current-state reference)

Notation: `PK` primary key; `FK` foreign key; `UK` unique constraint; `NULL` nullable. This is a readable schema summary based on the supplied column export and repository migrations. Run `00_schema_audit.sql` before treating the list of constraints as final.

## Application tables

```text
SUPER_CATEGORIES(
  id PK UUID, name UK VARCHAR(100) NOT NULL, slug UK VARCHAR(100) NOT NULL,
  icon TEXT NULL, color VARCHAR(50) NULL
)

GENRES(
  id PK UUID, super_category_id FK -> SUPER_CATEGORIES.id NOT NULL,
  name UK VARCHAR(100) NOT NULL, slug UK VARCHAR(100) NOT NULL,
  icon TEXT NULL, description TEXT NULL, color VARCHAR(50) NULL,
  is_learning BOOLEAN DEFAULT FALSE, is_fiction BOOLEAN DEFAULT FALSE,
  book_count INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
)

BOOKS(
  id PK UUID, genre_id FK -> GENRES.id NOT NULL,
  title VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL,
  description TEXT NULL, cover_image_url TEXT NULL,
  page_count INTEGER NULL, published_year INTEGER NULL, isbn VARCHAR(20) NULL,
  language VARCHAR(50) DEFAULT 'English', amazon_url TEXT NULL, goodreads_url TEXT NULL,
  expert_rating NUMERIC NULL, community_rating NUMERIC NULL,
  total_reviews INTEGER DEFAULT 0, expert_quote TEXT NULL, expert_name VARCHAR(150) NULL,
  difficulty_level VARCHAR(20) NULL,
  next_book_id FK -> BOOKS.id NULL,
  tags TEXT[] NULL, vibe VARCHAR(100) NULL, plot_type VARCHAR(100) NULL,
  length_category VARCHAR(20) NULL,
  is_featured BOOLEAN DEFAULT FALSE, is_editors_pick BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NULL, updated_at TIMESTAMPTZ NULL,
  search_vector TSVECTOR NULL, series_name VARCHAR(255) NULL, series_number INTEGER NULL,
  external_id UK VARCHAR NULL,
  ai_review_summary TEXT NULL, ai_pros TEXT[] NULL, ai_cons TEXT[] NULL,
  ai_rating NUMERIC NULL, ai_last_updated TIMESTAMPTZ NULL,
  fiction_genres TEXT[] DEFAULT '{}', free_reading_url VARCHAR NULL,
  embedding VECTOR(768) NULL, author_image_url TEXT NULL, author_bio TEXT NULL
)

AUTHORS(
  id PK UUID, name UK TEXT NOT NULL, ai_bio TEXT NULL, ai_style TEXT[] NULL,
  ai_last_updated TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NULL, updated_at TIMESTAMPTZ NULL
)

REVIEWS(
  id PK UUID, book_id FK -> BOOKS.id NOT NULL,
  reviewer_name VARCHAR NOT NULL, rating INTEGER NOT NULL,
  content TEXT NOT NULL, created_at TIMESTAMPTZ NULL,
  user_id FK -> auth.users.id NULL, source TEXT DEFAULT 'local' NULL,
  external_author_name TEXT NULL
)

USER_SHELVES(
  id PK UUID, user_id FK -> auth.users.id NOT NULL,
  book_id FK -> BOOKS.id NOT NULL,
  status VARCHAR(50) NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, book_id)
)

BOOK_EDGES(
  id PK UUID, book_a_id FK -> BOOKS.id NOT NULL,
  book_b_id FK -> BOOKS.id NOT NULL, weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  relationship_type VARCHAR(50) NOT NULL, created_at TIMESTAMPTZ NULL,
  UNIQUE(book_a_id, book_b_id), CHECK(book_a_id <> book_b_id)
)

USER_READER_PROFILES(
  id PK UUID, session_id UK TEXT NOT NULL, mood VARCHAR(50) NULL,
  pace_preference VARCHAR(50) NULL, complexity_preference VARCHAR(50) NULL,
  era_preference VARCHAR(50) NULL, length_preference VARCHAR(50) NULL,
  created_at TIMESTAMPTZ NULL
)

BLIND_DATE_INTERACTIONS(
  id PK UUID, session_id TEXT NOT NULL,
  book_id FK -> BOOKS.id NOT NULL, accepted BOOLEAN NOT NULL, created_at TIMESTAMPTZ NULL
)

USERS(
  id PK/FK -> auth.users.id UUID, email VARCHAR NOT NULL,
  role VARCHAR(50) DEFAULT 'User', created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK(role IN ('Admin','User','Faculty','Student'))
)
```

## View

```text
BOOK_DETAILS_VIEW(book_id, title, average_rating, review_count)
```

`BOOK_DETAILS_VIEW` is derived from `BOOKS LEFT JOIN REVIEWS`, and is not a base table.

## Explicit limitations of this current-state design

1. `BOOKS.author` is free text and has no FK to `AUTHORS.id`.
2. `BOOKS.tags`, `BOOKS.fiction_genres`, `AUTHORS.ai_style`, `BOOKS.ai_pros` and `BOOKS.ai_cons` are arrays. They can be indexed and useful for this app but are not a fully atomic child-table representation under a strict 1NF normalization exercise.
3. `GENRES.book_count` and `BOOKS.total_reviews` can become stale unless they are derived or updated by a defined process.
4. `BLIND_DATE_INTERACTIONS.session_id` is not linked to `USER_READER_PROFILES.session_id` by an FK in the supplied migration.
5. The current unique constraint on `BOOK_EDGES(book_a_id, book_b_id)` blocks duplicate ordered edges but does not alone prohibit both `(A,B)` and `(B,A)`.
6. `AUTH_USERS` refers to Supabase-managed `auth.users`; it is not an application-owned table.
