#!/bin/bash
# Backup PostgreSQL database (DBMS Lab Requirement)

# Set these variables or export them in your environment
DB_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/postgres"}
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
pg_dump "$DB_URL" -F c -f "$BACKUP_DIR/backup_$DATE.dump"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: backup_$DATE.dump"
else
    echo "Backup failed!"
    exit 1
fi
