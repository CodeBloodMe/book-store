-- Read-only review of application-defined SECURITY DEFINER functions.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_userbyid(p.proowner) AS owner,
       p.proconfig AS function_settings,
       p.proacl AS privileges,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- Review each function for:
-- * least privilege and required EXECUTE grants
-- * fixed search_path (prefer SET search_path = '' and schema-qualify referenced objects)
-- * authorization checks if user-specific data is accessed
-- * validation of limits and arguments
-- * no dynamic SQL built from untrusted text
-- Revoke public/anon EXECUTE only after confirming which functions the application legitimately calls.
