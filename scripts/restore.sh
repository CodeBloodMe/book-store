#!/bin/bash
# Restore PostgreSQL database from dump (DBMS Lab Requirement)

# Set these variables or export them in your environment
DB_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/postgres"}
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <path_to_backup_file.dump>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "Starting database restore from $BACKUP_FILE..."
# Warning: Clean flag (-c) drops database objects before recreating them.
pg_restore -c -d "$DB_URL" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully."
else
    echo "Restore failed!"
    exit 1
fi
