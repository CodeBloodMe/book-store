# ChapterOne DBMS — Part 3 Continuation

Use this small package with the existing ChapterOne Supabase project. Start with `CONTINUE_HERE.md`.

- `01_corrected_constraint_audit.sql`: correct catalog-based constraint audit.
- `02_orphan_book_reference_checks.sql`: verify whether reviews/shelves reference missing books.
- `03_add_missing_book_foreign_keys.sql`: guarded FK addition; requires zero orphans and backup.
- `04_validate_book_foreign_keys.sql`: validate and prove constraints.
- `05_dbms_query_demos.sql`: joins, aggregates, view, filter, pagination, EXPLAIN, transaction.
- `06_security_definer_review.sql`: definitions/ownership/privilege inspection for SECURITY DEFINER functions.

Nothing here has been applied to your Supabase database. Do not run steps 3–4 until steps 1–2 are reviewed and a backup exists.
