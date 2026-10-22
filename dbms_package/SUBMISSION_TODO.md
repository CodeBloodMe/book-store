# Submission readiness checklist

**Solo ChapterOne DBMS project - read before using this package.**

1. Populate student name, registration number and slot in the Word report.
2. Run `sql/00_schema_audit.sql` and review the complete live schema, constraints, RLS policies, indexes and triggers.
3. Take a backup before making schema changes. The fresh-database bootstrap script is for a new database only and must not be run against your current populated project.
4. Run the data integrity audit and record actual results.
5. Run `sql/02_assessment_queries.sql` section by section. Do not blindly execute the commented DELETE.
6. Review `sql/03_book_rating_function.sql`, `sql/04_books_updated_at_trigger.sql`, and optional `sql/06_auth_rbac_setup.sql` before applying. A database backup and verified prerequisites are required.
7. Follow `orm-integration/SETUP.md`, copy the sample server-side files into the repository, test the route and capture evidence.
8. Add CI workflow to `.github/workflows/main.yml`, configure GitHub Secrets, and require a passing run.
9. Verify private repository settings, main/dev branches, meaningful commit history, Docker run, deployment and custom domain.
10. Capture timestamped screenshots of actual inputs/outputs and replace `PENDING` evidence statuses in the final report.

The bundle cannot remotely modify your Supabase project, GitHub repository, Vercel project or custom-domain DNS. Those operations must be performed in your accounts. Do not submit the templates as if they were executed.
