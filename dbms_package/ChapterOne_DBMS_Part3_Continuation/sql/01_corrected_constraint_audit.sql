-- ChapterOne: corrected live constraint audit (read-only)
-- Uses pg_catalog so foreign keys correctly show their referenced table,
-- including cross-schema references such as auth.users.
SELECT
    child_ns.nspname AS schema_name,
    child.relname AS table_name,
    con.conname AS constraint_name,
    CASE con.contype
      WHEN 'p' THEN 'PRIMARY KEY'
      WHEN 'f' THEN 'FOREIGN KEY'
      WHEN 'u' THEN 'UNIQUE'
      WHEN 'c' THEN 'CHECK'
      ELSE con.contype::text
    END AS constraint_type,
    pg_get_constraintdef(con.oid, true) AS definition,
    CASE WHEN con.contype = 'f' THEN con.confrelid::regclass::text END AS referenced_table
FROM pg_constraint con
JOIN pg_class child ON child.oid = con.conrelid
JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
WHERE child_ns.nspname = 'public'
  AND con.contype IN ('p','f','u','c')
ORDER BY child.relname, constraint_type, con.conname;

-- Specific FK check for the two expected missing constraints and existing user links.
SELECT con.conrelid::regclass AS source_table,
       con.conname AS constraint_name,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.conrelid IN (
    'public.reviews'::regclass,
    'public.user_shelves'::regclass,
    'public.users'::regclass
  )
ORDER BY source_table, constraint_name;
