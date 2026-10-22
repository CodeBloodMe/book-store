# ChapterOne — Antigravity Project Handoff

## Your role
Act as a senior full-stack engineer and DBMS assessment mentor. Continue work inside the EXISTING ChapterOne repository/workspace. The project was developed in Antigravity; do not migrate tools or recreate the application from scratch.

Repository: https://github.com/CodeBloodMe/book-store
Course: VIT BCSE302P — Database Systems Lab
Assessment: Lab Internal Assessment Tests 8, 9 & 10 — 30-mark rubric plus optional extra marks
Project type: Solo project
Database: Supabase PostgreSQL
Application: Next.js, React, TypeScript; existing code primarily uses Supabase JS. A Prisma schema file exists, but actual Prisma runtime integration has not yet been proven.

## Mandatory first action: read-only audit
Do NOT edit code, apply migrations, execute destructive scripts, or access/modify the live database in this first phase.

1. Inspect the whole current workspace and Git status before doing anything. Preserve all user changes; never reset, checkout over, or discard modifications.
2. Read the repository `README.md`, `PROJECT_DOCUMENTATION.md`, `package.json`, the complete `prisma/schema.prisma`, all files under `supabase/migrations/`, relevant `app/api/` routes, `lib/` helpers, existing tests, Dockerfile, and workflows.
3. Inspect existing test/build scripts and the actual branch and recent commit history.
4. Make a repository-grounded assessment report with three labels: VERIFIED IN SOURCE, NEEDS RUNTIME VERIFICATION, and MISSING/DEFECTIVE. Do not claim a test passed unless you ran it and observed success.
5. Do not print, reveal, copy, or inspect secret values from `.env` files. Report only variable names and whether the needed variables appear to be configured. Never commit secrets.
6. Do not call external services, write to Supabase, or run any migration in this phase.
7. Finish Phase 1 by summarizing the findings and proposing a small, ordered plan. Wait for explicit approval before implementing schema or security changes.

## Assessment checklist
Work through each rubric section in order:

1. Problem statement and project planning: title, problem, objectives, scope, solo responsibilities, stack, deliverables, timeline.
2. Database design: accurate ER diagram, relational schema, data dictionary, minimum 8–10 related application tables, primary/foreign keys, constraints, 3NF discussion and indexes. Every application table must appear in the ERD. A view and Supabase-managed `auth.users` do not count as application-owned base tables.
3. Database implementation: creation/migrations, CRUD, joins, aggregate queries, views, transactions, a stored function/procedure where supported, trigger, indexes, and an ORM used by actual application code where applicable.
4. Application: responsive UI, login, dashboard/library, CRUD, search, filtering, pagination, form validation, exceptions.
5. Security: authentication/login/logout/user identity, minimum two roles, role-aware menu/page/API access, one profile/users table with role column, RLS, least privilege, SQL injection prevention, secret management. Do not trust role metadata supplied by users.
6. Professional practice: private GitHub repository, meaningful commits (minimum 10), `main` and `dev` branches, README, correct `.gitignore`, backup and recovery using PostgreSQL tools, Docker, cloud deployment.
7. CI/CD with GitHub Actions or equivalent.
8. Custom domain if required by the rubric.
9. One additional best practice such as automated testing, audit logging, monitoring, or query-performance optimization.

## Known context from earlier review — re-verify against the current workspace and live schema
- Core visible public tables: `super_categories`, `genres`, `books`, `authors`, `reviews`, `user_shelves`, `book_edges`, `user_reader_profiles`, `blind_date_interactions`; a migration also defines `public.users`, which must be verified in the live database.
- `public.book_details_view` is a view, not a base table.
- `books` includes a text `author` field; a formal FK from `books.author` to `authors.id` has not been established in the schema reviewed so far.
- `books` includes array fields such as `tags`, `fiction_genres`, `ai_pros`, and `ai_cons`; `authors.ai_style` is also an array. Explain the 1NF/normalization trade-offs rather than falsely claiming everything is fully normalized.
- `books.genre_id` references `genres.id`; `genres.super_category_id` references `super_categories.id`; `books.next_book_id` is a self-reference.
- The constraint audit output appeared to lack `reviews.book_id` and `user_shelves.book_id` foreign keys. This MUST be rechecked using a correct FK audit before any fix; the prior audit query had a faulty join for resolving referenced table names.
- `book_edges` includes `book_a_id`, `book_b_id`, `weight`, `relationship_type`, `created_at`; its uniqueness constraint is on the ordered pair and may not prevent `(A,B)` and `(B,A)` both being stored.
- `user_reader_profiles` stores `session_id`, mood and preferences. `blind_date_interactions.session_id` is text and no FK to the profile session was established in the reviewed migration.
- App functions present in the function audit include `find_reading_path`, `get_book_neighbors`, `get_blind_date_stats`, `match_mystery_book`, `find_similar_books`, `match_books`, and `books_search_vector_update`. Several functions were flagged `SECURITY DEFINER`; inspect exact definitions, `search_path`, grants, caller inputs, and underlying data access. Do not make them public or change privileges without review.
- The BookWeb API had a fallback path that may fabricate a route from random/genre-selected books when real graph traversal fails. Review this carefully and ensure an API returns success only for a real path whose adjacent pairs have persisted edges.
- A reviewed seed script drops tables with `CASCADE`. Do NOT run it against a populated/live database.
- The existing application mostly uses Supabase JS. A Prisma schema by itself does not prove the required ORM integration. First inspect schema compatibility and propose a safe, server-only Prisma path; never run `prisma db push` or `migrate dev` on the live database without an explicit reviewed plan and backup.
- A migration file `add_free_reading_url.sql` appeared empty; compare with live schema and all later migrations before addressing it.

## Guardrails while implementing
- Keep the current product and existing feature set; no rewrite from scratch.
- Work on a feature branch, preferably `dev` or a new `fix/dbms-*` branch after checking the current branch/status.
- Before each stage, state the files you intend to change and why. Make small, reviewable changes.
- Prioritize non-destructive repository inspection and tests before DB mutations.
- Never run the `08_fresh_database_bootstrap.sql` from the ChatGPT package against the existing populated database; it is for a fresh database only.
- Do not apply any SQL migration to the live Supabase project without showing the exact SQL, its expected effects, prerequisite checks, rollback/restore strategy, and getting explicit user approval.
- Do not add a book foreign key or unique constraint until checking for orphan rows and duplicate data. Prepare a read-only report/query first.
- Prefer existing project conventions; do not introduce dependencies unless necessary.
- Keep `.env`, `.env.local`, service-role keys, database URLs, tokens, backups and dumps out of Git. Never reveal secret values in terminal output.
- Use parameterized database APIs / ORM, validation, clear HTTP statuses and server-side authorization.
- Do not invent screenshots, result counts, performance improvements, test results or deployment status.
- Do not commit or push, change GitHub repo visibility, create paid resources, or configure DNS unless explicitly instructed.

## Required workflow
Phase 1 — Read-only repo audit and prioritized plan. Do this now and stop for approval.
Phase 2 — Database schema/ERD/data dictionary aligned to the audited source and live constraint output.
Phase 3 — DBMS query demonstrations (CRUD, joins, aggregates, view, transaction) and tests.
Phase 4 — Stored function, trigger, index analysis and function security review.
Phase 5 — ORM integration and app requirements: pagination, validation, exception handling.
Phase 6 — Authentication/RBAC/RLS/security hardening with negative tests.
Phase 7 — Backup/restore procedure, Docker, GitHub hygiene and CI/CD.
Phase 8 — Deployment/domain readiness and final evidence/report.

For each phase: list findings, show exact file changes, run the relevant tests where safe, report exact command outputs/success/failures, and wait for approval before a live database change or other irreversible action.

## Phase 1 output format
Produce `docs/DBMS_AUDIT_PHASE1.md` only if creating that new file is safe and does not overwrite existing content; otherwise present the report in the chat first. Include:
- Workspace/repository identity, branch and Git status (without secret values)
- Actual tables/view/functions/migrations/routes/tests discovered
- Requirements matrix: requirement, source evidence, status, next action
- Bugs and security concerns ordered by severity
- Tests/builds that were run and exact results; note anything not run
- Ordered implementation plan for approval

Start with the read-only audit. Do not change application code or database state during Phase 1.
