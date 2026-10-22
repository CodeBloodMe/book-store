# ChapterOne / Book Store — DBMS hardening and assessment guide

## What the project demonstrates

- **RDBMS:** Supabase PostgreSQL, with the existing `pgvector` extension for semantic retrieval.
- **ORM:** Prisma for typed relational CRUD, relations, filtered queries, pagination, and aggregate/count operations. The application still uses the Supabase client where its API is materially useful: authenticated RLS-scoped operations, `pgvector` RPCs, and server-side Postgres functions. Do not claim every query has been migrated to Prisma unless that migration is actually completed.
- **Relational features:** users, books, genres, reviews, reading shelves, graph edges, reader profiles, and interaction history; primary/foreign keys, unique constraints, checks, indexes, joins, aggregate views, and transactions.
- **Advanced PostgreSQL:** pgvector similarity search, HNSW index, recursive graph traversal, role/row-level security, a review-summary trigger, and a true maintenance procedure (`CALL public.refresh_user_review_summaries()`).

## Important distinction

A file containing SQL is not proof that the SQL is installed or functioning. The hardening migration and matching route changes are now merged into this repository, but the migration has not been applied to the live Supabase database. Run the staged steps below, capture output from the target database, and report only observed results.

## Before applying the migration

1. Back up the existing database with Supabase's backup tooling or `pg_dump`.
2. In the Supabase SQL Editor, run all read-only diagnostics in `supabase/tests/dbms_preflight.sql` first. Resolve duplicate profile emails, invalid roles, orphan references, invalid reviews, and invalid graph weights/scores before applying the migration.
3. Verify that all prior project SQL migrations have been applied, especially `create_reviews_table.sql`, `create_blind_date_tables.sql`, `create_book_edges.sql`, `create_find_reading_path.sql`, `create_match_mystery_book.sql`, `add_auth_and_shelves.sql`, and `9999_dbms_requirements.sql`.
4. Apply `supabase/migrations/zzz_dbms_hardening.sql` in the Supabase SQL Editor only after verifying migration history and reviewing the statements against the preflight output. The existing repository uses non-timestamp migration names; do not assume a clean `supabase db push` migration history.
5. Run all of `supabase/tests/dbms_acceptance_checks.sql`. The final block uses a transaction and rolls back its test review insert/delete. Preserve the output as evidence.

## App changes required with this migration

The migration makes shared catalog tables read-only to browser roles, removes direct anonymous access to blind-date session/interaction tables, and restricts user-owned writes with RLS. The project now uses a server-only Supabase client for privileged import, embedding, genre-update, and Blind Date operations. Import and test-data routes retain the signed-in Admin role check. Blind Date uses UUID session IDs and binds reveal decisions to the active match through `record_blind_date_interaction`.

Set `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` and the deployment provider's **server-side secret settings**. Set a random `CRON_SECRET` of at least 32 characters. Never prefix secrets with `NEXT_PUBLIC_`, commit them, or put them in a client component. Admin mutations use the authenticated profile role and do not use a shared header key. This code accepts `SUPABASE_SECRET_KEY` first and uses `SUPABASE_SERVICE_ROLE_KEY` as a compatibility fallback.


### Privileged role provisioning

1. Create/sign in to the intended administrator through Supabase Auth.
2. Confirm exactly one corresponding profile row exists in `public.users`.
3. In a trusted SQL Editor session, promote that exact profile deliberately:

   ```sql
   UPDATE public.users AS u
   SET role = 'Admin', updated_at = NOW()
   FROM auth.users AS a
   WHERE a.id = u.id
     AND lower(a.email) = lower('replace-with-the-admin-email');
   ```

4. Verify the statement affected exactly one row and verify that regular authenticated users cannot update their own `role`. Never expose a role-assignment API that trusts a user-supplied role field.

## Role-gated admin dashboard

The existing `/admin` page checks the authenticated account's `public.users.role` on the server before it runs privileged database-count queries through Prisma. Desktop and mobile navigation show the dashboard link only to Admin users; server authorization remains the real control. Capture (1) a normal user denied access and (2) an Admin seeing live counts after provisioning the role in a trusted SQL Editor session.

## DBMS demonstration checklist

| Requirement | Evidence to capture |
|---|---|
| ER diagram / relational schema | `docs/ERD_AND_DATA_DICTIONARY.md` plus the actual schema inspection queries |
| Primary and foreign keys | `pg_constraint` query output |
| 3NF and constraints | ERD, data dictionary, checks and relationship explanations; note any legacy fields retained for compatibility |
| CRUD through ORM | `/api/dbms-demo?page=1&limit=10&q=python&sort=reviews` (catalog search/filter/pagination/joins/count transaction) and `/api/dbms-demo/reviews` (authenticated Prisma review GET/POST/PATCH/DELETE scoped by user ID) |
| Join | ORM responses include the `genre` relation, book relation for reviews, and review/shelf counts; SQL view joins books and reviews |
| Aggregate query | `book_details_view`, `user_review_average`, `user_review_count` |
| Transaction | `$transaction` in the ORM endpoint and transactional `record_blind_date_interaction` function |
| Stored procedure | Run `CALL public.refresh_user_review_summaries();` in a controlled test environment |
| Trigger | Acceptance script verifies review insert/delete recomputes local review aggregates |
| Indexes | `pg_indexes` output, including vector and relationship-query indexes |
| Authentication/RBAC/RLS | Test own shelf CRUD, own review edit/delete, rejection of cross-user operations, non-admin genre-update rejection, non-admin import/cron rejection, and privileged role changes |
| Backup/recovery | Attach a real backup command and a successful restore test log; documentation alone is insufficient |
| CI/CD/Docker/deployment | Keep workflow green, build the Docker image, deploy, and capture the live URL plus successful checks |

## SQL snippets for an oral demonstration

```sql
-- View combining book metadata and user review aggregates
SELECT *
FROM public.book_details_view
ORDER BY review_count DESC, average_rating DESC
LIMIT 10;

-- Maintained local user-review metrics; these do not overwrite imported ratings
SELECT id, title, community_rating, user_review_average, user_review_count
FROM public.books
ORDER BY user_review_count DESC
LIMIT 10;

-- Actual PostgreSQL stored procedure
CALL public.refresh_user_review_summaries();

-- Verify actual constraints / whether they have been validated
SELECT conrelid::regclass AS table_name, conname, contype, convalidated
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name::text, conname;
```

## Honest limitations to resolve before claiming a perfect 3NF design

The current application stores some metadata as PostgreSQL arrays (`tags`, `fiction_genres`, and similar fields) and uses `books.author` as a display string while maintaining a separate `authors` table. These legacy representations need a planned, tested normalization into junction tables if your evaluator interprets 1NF/3NF strictly. Do not claim the whole database is fully 3NF until the data model and application queries have been migrated together. The current upgrade pack focuses first on referential integrity, access control, transactional correctness, and rubric evidence without deleting legacy data.

## Protected administrative endpoints

- `POST /api/populate-all` and `POST /api/populate-genre` require a signed-in Admin profile; genre import accepts `{ "slug": "the-genre-slug" }` or the existing `?slug=` query form.
- `POST /api/test-data` accepts `{ "action": "add" }` or `{ "action": "remove" }`, requires a signed-in Admin profile, and returns 404 in production.
- `GET /api/cron/embed` requires `Authorization: Bearer <CRON_SECRET>`; do not put this token in a query string.
- AI generation routes require a signed-in Supabase user for uncached/provider-consuming generation. Cached public summaries remain readable.
- `updateBookGenre` requires an Admin role in `public.users`.

Keep `CRON_SECRET` random, at least 32 characters, and in server-only deployment settings. Rotate it if it has been exposed.

## Backup and recovery scripts

Use `scripts/backup.sh` with `DATABASE_URL`, retain the dump outside Git, and test `scripts/restore.sh` against a separate empty staging database using `RESTORE_DATABASE_URL`. The restore script refuses to reuse `DATABASE_URL` and does not run `pg_restore --clean`. A successful backup alone is not recovery evidence.
