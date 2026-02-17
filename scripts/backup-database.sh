#!/bin/bash

# Database backup script
# This script creates a full database backup before migration

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Set backup directory
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Use pg_dump to create backup
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✓ Database backup completed successfully!"
  echo "Backup saved to: $BACKUP_FILE"
  
  # Compress the backup
  gzip "$BACKUP_FILE"
  echo "✓ Backup compressed: ${BACKUP_FILE}.gz"
  
  # Show backup size
  ls -lh "${BACKUP_FILE}.gz"
else
  echo "✗ Database backup failed!"
  exit 1
fi

# Optional: Keep only last 5 backups
echo "Cleaning old backups (keeping last 5)..."
ls -t ${BACKUP_DIR}/database_backup_*.sql.gz | tail -n +6 | xargs -r rm
echo "✓ Cleanup completed"
