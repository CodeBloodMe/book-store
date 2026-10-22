# PostgreSQL backup and restore

Use a trusted machine with PostgreSQL client tools installed. Set `DATABASE_URL` and `RESTORE_DATABASE_URL` in the shell, not in source code. The repository scripts require these variables and do not provide a default database URL. Prefer a least-privileged database user capable of reading the schema/data required for backup. Keep dump files outside Git and encrypt them if they contain user data.

## Backup (custom archive)

```bash
export DATABASE_URL='postgresql://...'
bash scripts/backup.sh
```

## Restore test to a separate empty test database

```bash
export RESTORE_DATABASE_URL='postgresql://...separate-empty-test-database...'
bash scripts/restore.sh backups/backup_YYYYMMDD_HHMMSS.dump
```

## Validate recovery

1. Verify the adjacent SHA-256 checksum when one was created; keep the dump and checksum outside Git.
2. Restore into a separate test database.
3. Compare table/view counts against the source audit output.
4. Run schema audit and data integrity queries.
5. Test login-dependent behavior separately; authentication-provider configuration and secrets may need a separate secure setup.
6. Record date, dump size, restore duration, errors, and screenshots as evidence.

The restore script refuses to use the same URL as `DATABASE_URL` and does not use `pg_restore --clean`. Restore into a separate empty test database. A successful dump command alone is not proof of successful recovery; restore and validate it.
