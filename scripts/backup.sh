#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL in the shell or load it from a secret manager.}"
command -v pg_dump >/dev/null 2>&1 || { echo 'pg_dump is required.' >&2; exit 1; }

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="$BACKUP_DIR/chapterone-${TIMESTAMP}.dump"

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$OUTPUT"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUTPUT" > "${OUTPUT}.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUTPUT" > "${OUTPUT}.sha256"
else
  echo 'Backup created, but no SHA-256 utility was found.' >&2
fi

echo "Backup created: $OUTPUT"
echo 'Store it securely outside version control and test restore into a separate database.'
