# DBMS Assessment Completion Audit

**Assessment:** VIT BCSE302P Database Systems Lab, Assessments 8, 9 and 10
**Project:** ChapterOne book discovery and reading platform
**Student metadata found in source:** Krish, 24BCE0846, slot L25+L26
**Repository:** `my-books-site`

This audit summarizes source and local validation only. It does not claim live database, GitHub Actions, hosting or custom-domain results. The project question paper takes precedence over this summary; use its exact submission and screenshot requirements.

## Rubric readiness

| Rubric item | Source work in repository | Evidence still required |
| --- | --- | --- |
| Problem statement and planning (2) | Report includes problem, objectives, scope, deliverables and current implementation status. | Verify official name and instructor-specific submission requirements. |
| Database design (4) | ERD, relational schema, data dictionary, constraints, index and normalization discussion. | Run the complete live schema audit; confirm constraints/FKs and document known array, author and session relation limitations. |
| Database implementation (7) | SQL examples and scripts for CRUD, joins, aggregates, view, transaction, function, trigger, integrity/security audits. | Execute each applicable script safely and capture dated input/output/error evidence. |
| Application (4) | Existing Next.js project plus Prisma DBMS route, paginated/searchable retrieval, Admin dashboard and server API. | Verify database connection, UI flows, validation, error cases and screenshots. |
| Authentication/security (5) | Cookie-based Supabase identity check, role lookup, Admin-only server routes/page, authenticated AI generation and server-only privileged writes, safe cron auth, and a prepared profile/RLS hardening migration. | Review live schema/RLS, back up, apply the migration only after preflight, provision Admin through a trusted process, and capture signed-out/User/Admin allow-deny cases. |
| Professional practice (5) | Docker configuration, `.dockerignore`, CI workflow, safer backup/restore scripts, README and secret/dump ignores. | Verify repo privacy, branches, collaborators and commit history; run Docker and separate database restore; retain evidence. |
| CI/CD (1) | Workflow runs install, Prisma generation, lint, typecheck, unit tests and build. | Configure GitHub secrets and capture a successful hosted run. |
| Custom domain (1) | Deployment/domain checklist in report. | Verify live hosting, DNS, HTTPS and custom domain in account/browser. |
| Additional practice (1) | Local automated tests, type check, security smoke script, backup/restore procedure. | Run local security smoke and validate a restored database. |

## Authentication and authorization

- Supabase Auth establishes identity. `lib/require-role.ts` obtains the signed-in user from the cookie-aware server client and reads only that user’s role profile.
- Admin access is enforced in server code for `/admin`, `/api/admin/database-stats`, catalog imports and test-data mutations. Navbar links are shown only to Admins as a usability aid; they are not the security boundary.
- Bulk import and test-data changes use POST/DELETE methods. The embedding cron endpoint requires a configured bearer secret and returns an error when the secret is absent.
- Catalog writes that remain available to signed-in users use the server-only Supabase client after authentication; AI recommendation/path generation requires a valid application role. Cached public AI review results remain readable without a session.
- `dbms_package/sql/10_auth_rbac_preflight.sql` is read-only. `dbms_package/sql/11_auth_rbac_hardening.sql` adds the Auth identity relationship, least-privilege signup profile and self-only profile reads. The hardening script was not applied to the live database and does not grant an Admin role.
- The merged `supabase/migrations/zzz_dbms_hardening.sql` extends those protections to catalog tables, owner-scoped reviews/shelves, Blind Date session handling, integrity constraints, and maintained review aggregates. The application routes are prepared for it, but it is **not applied** to the live database.
- The checked-in `20261022_dbms_enhancements.sql` source now assigns the least-privileged User role and uses self-only profile reads. If an earlier version was already applied, editing the file does not prove the deployed database changed; inspect migration history and live policies. The separate hardening script requires preflight and backup.

## Database limitations to disclose

- `books.author` is text and is not linked to `authors.id` by a foreign key.
- `blind_date_interactions.session_id` has no foreign key to `user_reader_profiles.session_id` in the reviewed migration.
- Several attributes use arrays, so strict 1NF would require child/bridge relations; duplicated author fields and cached counts also have normalization trade-offs.
- The ordered `book_edges` unique key alone allows reverse-direction duplicate pairs.
- The supplied live column export was truncated during `user_shelves`; all deployed constraints, grants, RLS policies and functions remain to be checked.

## Local verification

- `npm test`: passed, 6 tests.
- `npm run typecheck`: passed after merging the upgrade schema and routes.
- `npx prisma validate` and `npx prisma generate`: passed using a non-secret placeholder URL; no database connection was attempted.
- `npm run lint`: completed with 0 errors and 143 warnings.
- `npm run build`: completed successfully with placeholder configuration after removing build-time Google Fonts downloads. Placeholder Supabase DNS lookups failed during build-time data reads; this is not a live database check.
- `npm run test:security`: passed 11/11 local signed-out and method checks on the production server.
- `bash -n scripts/backup.sh scripts/restore.sh`: passed with Git Bash.
- No PostgreSQL client/server or working Docker engine was available. The Supabase migration/preflight/acceptance SQL, hosted database, backup/restore, GitHub Actions, deployment and DNS were not verified.

## Before submission

Follow `dbms_package/SUBMISSION_TODO.md`. The report and source cannot substitute for actual timestamped input/output/error screenshots or account-side proof. The repository identity has only the name “Krish”; verify the official full-name spelling before uploading. Use the question paper’s filename convention exactly.
