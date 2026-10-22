# ChapterOne DBMS Assessment Package

This bundle supports the solo ChapterOne Database Systems Lab project for VIT BCSE302P. It is organized against the 30-mark project rubric and the current source/schema evidence shared in the conversation.

## Contents

- `report/ChapterOne_DBMS_Project_Report.docx` and `.pdf`: project report draft with planning, design, SQL concepts, ORM plan, authentication/security, testing, backup/recovery, deployment and a rubric checklist.
- `diagrams/ChapterOne_Current_ERD.png` and `.svg`: current-state working ER diagram. `ChapterOne_Current_ERD.mmd` is the Mermaid source; `.dot` is Graphviz source.
- `sql/00_schema_audit.sql`: read-only schema, constraints, index, trigger, RLS and function audit.
- `sql/01_data_integrity_audit.sql`: read-only data-quality checks.
- `sql/02_assessment_queries.sql`: CRUD, joins, aggregates, view, filter, pagination, EXPLAIN and transaction demonstrations. The insert/update demonstrations use a stable `external_id` reserved for the demo.
- `sql/03_book_rating_function.sql`: restricted stored function demonstration.
- `sql/04_books_updated_at_trigger.sql`: trigger demonstration.
- `sql/05_security_audit.sql`: read-only security review queries.
- `sql/06_auth_rbac_setup.sql`: optional auth-profile/RBAC hardening migration; review and back up before applying.
- `sql/07_reference_schema_notes.md`: mapping of evidence to the known schema.
- `sql/08_fresh_database_bootstrap.sql`: consolidated schema bootstrap for a brand-new Supabase project only; do not run on the existing populated database.
- `sql/09_relational_schema.md`: complete relational-schema notation and explicit current-state limitations.
- `orm-integration/`: Prisma setup instructions, ORM-backed paginated search route, and role-check helper examples.
- `ops/backup_restore.md`: PostgreSQL backup and separate-database restore-test procedure.
- `ops/.env.example` and `ops/.dockerignore`: operational templates.
- `ops/gitignore-template.txt`: recommended ignore rules for secrets, backups and build output.
- `ci/main.yml`: GitHub Actions CI workflow template. Copy to `.github/workflows/main.yml` in the repository and configure GitHub Secrets before enabling it.

## Important status note

This is a prepared project and implementation bundle, not proof that every migration, ORM integration, test, CI job, deployment or custom domain has already been run. The live column export supplied in the conversation was truncated during `user_shelves`; run `sql/00_schema_audit.sql` to verify the complete deployed schema before applying migrations. The report labels items needing live verification and evidence.

## Safe workflow

1. Fill in your name, registration number and slot in the report.
2. Run `sql/00_schema_audit.sql` and save the result.
3. Take a database backup.
4. Run `sql/01_data_integrity_audit.sql`; record any findings.
5. Use `sql/02_assessment_queries.sql` section by section. Only delete the dedicated demo book if you want to clean up the demonstration record.
6. Review and apply trigger/RBAC scripts only after confirming prerequisites and backup status.
7. Integrate Prisma via `orm-integration/SETUP.md`; do not use Prisma migrations against live Supabase without a reviewed migration plan.
8. Execute tests, backup/restore validation, Docker and CI locally/in the configured accounts, then capture timestamped evidence.
9. Replace every `PENDING` item in the report/checklist with verified evidence only.

## Existing repository findings reflected in the report

- Main application uses Next.js/React/TypeScript and Supabase PostgreSQL.
- The app has catalog/search/recommendation/reader/shelf/review/BookWeb/Blind Date areas.
- `book_details_view` is a view, not a base table.
- `books.author` is text; `authors` is not formally connected to books by a foreign key in the current SQL inspected.
- `user_reader_profiles.session_id` and `blind_date_interactions.session_id` are not linked by a foreign key in the supplied migration.
- `book_edges` currently stores `book_a_id`, `book_b_id`, `weight`, `relationship_type`, and timestamps; it does not currently define `evidence`, `similarity_score`, or `algorithm_version`.
- The current DB interactions in the project source mostly use Supabase JS; the provided Prisma files are integration steps, not already-executed integration.
