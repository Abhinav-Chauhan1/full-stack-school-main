# Migration Scripts

This folder contains scripts for safely migrating the database to remove UT4 from JuniorMark.

## Scripts Overview

### 1. backup-database.sh
**Purpose**: Create a complete database backup before migration

**Usage**:
```bash
./scripts/backup-database.sh
```

**Output**: 
- Creates `backups/database_backup_TIMESTAMP.sql.gz`
- Keeps last 5 backups automatically

**Requirements**:
- `pg_dump` installed
- `DATABASE_URL` environment variable set
- Bash shell

---

### 2. export-ut4-data.ts
**Purpose**: Export all UT4 data to JSON and CSV files for reference

**Usage**:
```bash
npx ts-node scripts/export-ut4-data.ts
```

**Output**:
- `backups/ut4_data_backup_TIMESTAMP.json` - Complete data
- `backups/ut4_data_summary_TIMESTAMP.csv` - Summary for Excel

**Requirements**:
- Node.js and ts-node
- Prisma client generated
- Database connection

---

### 3. recalculate-yearly-marks.ts
**Purpose**: Recalculate all yearly marks using the new logic after UT4 removal

**Usage**:
```bash
npx ts-node scripts/recalculate-yearly-marks.ts
```

**What it does**:
1. Finds all records with both half-yearly and yearly marks
2. Calculates best UT: max(halfYearlyBestUT, yearlyUT3)
3. Recalculates yearly totals with the new best UT
4. Updates grand totals and grades
5. Shows progress every 10 records

**Output**: Console log showing:
- Total records found
- Progress updates
- Success/error counts
- Final summary

**Requirements**:
- Migration must be applied first
- Prisma client generated
- Database connection

---

## Migration Workflow

```
1. backup-database.sh          → Full database backup
2. export-ut4-data.ts          → Export UT4 data for reference
3. [Apply Prisma migration]    → Remove ut4 column
4. recalculate-yearly-marks.ts → Recalculate with new logic
5. [Test application]          → Verify everything works
```

## Installation

Ensure you have the required dependencies:

```bash
# Install TypeScript and ts-node if not already installed
npm install -D typescript ts-node @types/node

# Generate Prisma client
npx prisma generate
```

## Environment Setup

Create a `.env` file with your database connection:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

## Troubleshooting

### "pg_dump: command not found"
Install PostgreSQL client tools:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### "Cannot find module '@prisma/client'"
Generate the Prisma client:
```bash
npx prisma generate
```

### "DATABASE_URL environment variable is not set"
Set it in your shell or .env file:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### Script permission denied
Make the script executable:
```bash
chmod +x scripts/backup-database.sh
```

## Safety Notes

- Always run backups before migration
- Test scripts in development first
- Keep backups for at least 30 days
- Verify recalculation results
- Monitor application after migration

## Support

For detailed migration instructions, see:
- **MIGRATION_GUIDE.md** - Complete step-by-step guide
- **QUICK_MIGRATION_STEPS.md** - Fast track for experienced devs
- **JUNIOR_MARK_CHANGES.md** - Technical changes documentation
