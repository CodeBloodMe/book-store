# PostgreSQL backup and restore

Use a trusted machine with PostgreSQL client tools installed. Set `DATABASE_URL` and `RESTORE_DATABASE_URL` in the shell, not in source code. Prefer a least-privileged database user capable of reading the schema/data required for backup. Keep dump files outside Git and encrypt them if they contain user data.

## Backup (custom archive)

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl \
  --file "backups/chapterone_$(date +%Y%m%d_%H%M%S).dump"
```

## Restore test to a separate empty test database

```bash
# Set RESTORE_DATABASE_URL to a separate test database, never the production URL.
pg_restore --dbname "$RESTORE_DATABASE_URL" --no-owner --no-acl \
  --exit-on-error "backups/chapterone_YYYYMMDD_HHMMSS.dump"
```

## Validate recovery

1. Restore into a separate test database.
2. Compare table/view counts against the source audit output.
3. Run schema audit and data integrity queries.
4. Test login-dependent behavior separately; authentication-provider configuration and secrets may need a separate secure setup.
5. Record date, dump size, restore duration, errors, and screenshots as evidence.

Do not use `pg_restore --clean` against the production URL as a routine demonstration. That option can drop existing objects. A successful dump command alone is not proof of successful recovery; restore and validate it.
