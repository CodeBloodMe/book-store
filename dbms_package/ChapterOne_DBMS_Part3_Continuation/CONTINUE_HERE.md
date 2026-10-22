# ChapterOne DBMS project — continuation after live constraint audit

## What the uploaded constraint output establishes

The public schema has primary keys and multiple checks. Confirmed major FKs include genres -> super_categories, books -> genres, books.next_book_id -> books, both book_edges endpoints -> books, and blind_date_interactions.book_id -> books. There are also FK constraints on reviews.user_id, user_shelves.user_id and users.id, but the original query used an incorrect join for referenced table names, so it did not show the targets.

The constraint output contains no constraint named `reviews_book_id_fkey` and none named `user_shelves_book_id_fkey`. Therefore the live audit does not establish book foreign keys on those two tables; check with the corrected catalog query.

## Do this next — in order

1. Run `sql/01_corrected_constraint_audit.sql`; its second result set correctly shows referenced tables and columns.
2. Run `sql/02_orphan_book_reference_checks.sql`. Both row-level queries should be empty and both counts should be zero before adding FKs.
3. Take a Supabase/PostgreSQL backup.
4. Only after confirming no orphans and a backup, run `sql/03_add_missing_book_foreign_keys.sql`.
5. If it commits successfully, run `sql/04_validate_book_foreign_keys.sql`. Save screenshots/results as timestamped DBMS evidence.
6. Run `sql/05_dbms_query_demos.sql`, capturing joins, aggregate output, view output, pagination, query plan and transaction rollback.
7. Run `sql/06_security_definer_review.sql`; inspect function ownership, grants, `search_path`, body and authorization logic. Do not blindly revoke permissions because app routes may depend on these RPCs.

## Important

This SQL package has not been run against the live database. It diagnoses and then carefully offers a repair; it does not claim the constraints have already been fixed. If orphan checks return rows, stop and review them rather than deleting records automatically.
