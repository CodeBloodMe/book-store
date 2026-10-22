-- ChapterOne: READ-ONLY live schema audit
-- Run in Supabase SQL Editor. This script does not modify application data.

-- A. Tables and views in public
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- B. Columns with resolved PostgreSQL types (better than data_type alone for vector/tsvector)
SELECT c.table_name, c.ordinal_position, c.column_name,
       format_type(a.atttypid, a.atttypmod) AS postgres_type,
       c.is_nullable, c.column_default
FROM information_schema.columns c
JOIN pg_namespace n ON n.nspname = c.table_schema
JOIN pg_class cl ON cl.relname = c.table_name AND cl.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
WHERE c.table_schema = 'public'
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.table_name, c.ordinal_position;

-- C. Primary keys, foreign keys, unique and check constraints
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
 AND tc.table_name = kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.constraint_schema = ccu.constraint_schema
 AND tc.table_name = ccu.table_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
 AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY','UNIQUE','CHECK')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- D. Indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- E. Triggers
SELECT event_object_table AS table_name, trigger_name, event_manipulation,
       action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- F. RLS enabled/forced status
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- G. RLS policies
SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- H. Functions and whether SECURITY DEFINER is enabled
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
