# Submission readiness checklist

**Solo ChapterOne DBMS project — status after source implementation.** Use this list with the supplied project question paper. Source implementation is complete for the items marked below; external evidence still requires execution in the student’s environment.

## Implemented in this repository

- [x] Project report updated with rubric mapping, identity from repository metadata, current architecture, authentication/RBAC status and explicit evidence limits.
- [x] Prisma-backed paginated/searchable DBMS endpoint and Admin database dashboard.
- [x] Server-side role enforcement for Admin UI, APIs and catalog maintenance operations.
- [x] Mutating test-data endpoints use POST/DELETE and require Admin; GET is informational.
- [x] Cron embedding endpoint requires a bearer secret and fails closed if it is not configured; AI catalog-generation writes require a signed-in role.
- [x] Read-only preflight, a consolidated Phase 1 hardening migration, and post-migration acceptance checks are included.
- [x] Docker ignore rules, secret-based backup, separate-database restore safeguards and CI type checking are included.
- [x] Local verification: Vitest passed 6 tests; TypeScript, Prisma validation/generation, and the production build passed; security smoke checks passed 11/11; ESLint completed with 0 errors and 143 warnings. The build used placeholder Supabase values and logged unreachable database requests; it did not verify the live database.

## Still requires the student’s environment or account

1. Verify the official full-name spelling; the repository currently identifies the student as **Krish**, registration **24BCE0846**, slot **L25+L26**.
2. Run `sql/00_schema_audit.sql` and `sql/01_data_integrity_audit.sql` read-only against the intended Supabase project; save timestamped results.
3. Run the assessment queries section by section and capture timestamped input/output/error screenshots.
4. Verify the server-side Prisma `DATABASE_URL`, then capture `/api/dbms-demo` output.
5. Review `supabase/tests/dbms_preflight.sql` and make a database backup. Apply `supabase/migrations/zzz_dbms_hardening.sql` only after confirming the exact target and its effects; then run the acceptance checks and test signed-out, User and Admin cases. The migration does not grant Admin to anyone.
6. Verify stored function/procedure and trigger definitions, inputs and outputs in the target database.
7. Retain the successful local `npm run test:security` log; build and run the Docker image with valid configuration and retain its logs.
8. Run a backup and restore into a separate test database; validate the restored data.
9. Verify private GitHub repository settings, `main` and `dev` branches, collaborators and meaningful commits. Capture a successful CI run.
10. Verify deployment and custom domain in the hosting/DNS accounts. Save the live URL and screenshots.
11. Use the exact faculty filename convention, upload the PDF to VTOP and the requested PDF/DOC files to Moodle.

Do not represent prepared scripts or source code as executed evidence. Do not run the fresh-database bootstrap against the existing populated project. Never print or commit secrets.
