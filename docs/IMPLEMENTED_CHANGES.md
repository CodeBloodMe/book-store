# DBMS upgrade: merged source changes

## In the repository

- `prisma/schema.prisma` models the book/genre, user/review/shelf, graph-edge, and Blind Date relations used by the application. PostgreSQL constraints remain the source of referential integrity.
- `/api/dbms-demo` demonstrates validated search, genre filtering, stable sort, pagination, relation joins, aggregate counts, a transaction for rows plus total count, and the assessment identity in its response.
- `/api/dbms-demo/reviews` provides authenticated Prisma review CRUD scoped to the signed-in user's ID.
- `/admin` and catalog maintenance endpoints use the `public.users.role` check. Privileged Supabase writes use the server-only `SUPABASE_SECRET_KEY` (or the legacy server-only service-role key); the key is never part of the browser bundle.
- Blind Date uses UUID session IDs, server-side writes, a stored active match, and a single-use database interaction function. Review, import, cron, and AI catalog writes are routed through server-side access controls.
- The hardening SQL, read-only preflight diagnostics, acceptance checks, ERD/data dictionary, 3NF plan, and submission guide are included.
- CI validates Prisma, generates the client, runs unit tests and lint, and builds the app using non-secret placeholder configuration. It does not connect to a hosted database.

## Not evidence of live deployment

The hardening migration has **not** been applied to any hosted database. No live preflight, SQL acceptance check, Admin role-denial test, backup restore, deployment, or hosted CI run is claimed by these source files. Run the preflight and review its findings against a verified backup before applying the migration. Capture actual output for submission.

## Remaining data-model work

`docs/THIRD_NORMAL_FORM_PLAN.md` describes the arrays and denormalized author display field that remain outside strict 1NF/3NF. Do not claim strict 3NF until the tables, backfill, application reads/writes, and reconciliation are complete.
