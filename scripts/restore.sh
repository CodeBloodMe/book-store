#!/bin/bash
# Restore PostgreSQL database from dump (DBMS Lab Requirement)

# Restore only into a separate, empty test database. Never fall back to production.
if [ -z "${RESTORE_DATABASE_URL:-}" ]; then
    echo "RESTORE_DATABASE_URL must point to a separate empty test database." >&2
    exit 1
fi

if [ -n "${DATABASE_URL:-}" ] && [ "$RESTORE_DATABASE_URL" = "$DATABASE_URL" ]; then
    echo "Refusing to restore into DATABASE_URL. Choose a separate test database." >&2
    exit 1
fi

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <path_to_backup_file.dump>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "Starting database restore into the separate test database..."
pg_restore --dbname "$RESTORE_DATABASE_URL" --no-owner --no-acl --exit-on-error "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully."
else
    echo "Restore failed!"
    exit 1
fi
