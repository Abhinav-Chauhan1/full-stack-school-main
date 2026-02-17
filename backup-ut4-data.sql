-- Backup script to save existing UT4 data before migration
-- Run this BEFORE applying the migration

-- Option 1: Create a backup table with all YearlyMarks data
CREATE TABLE IF NOT EXISTS "YearlyMarks_backup" AS 
SELECT * FROM "YearlyMarks";

-- Option 2: Export UT4 data to a separate table for reference
CREATE TABLE IF NOT EXISTS "YearlyMarks_ut4_backup" AS
SELECT 
  id,
  "juniorMarkId",
  ut3,
  ut4,
  "yearlynoteBook",
  "yearlysubEnrichment",
  "yearlyexamMarks",
  "yearlyexamMarks40",
  "yearlyexamMarks30",
  "yearlytotalMarks",
  "yearlygrade"
FROM "YearlyMarks"
WHERE ut4 IS NOT NULL;

-- Option 3: Create a JSON export of all data (for PostgreSQL)
-- This creates a table with JSON representation of all records
CREATE TABLE IF NOT EXISTS "YearlyMarks_json_backup" AS
SELECT 
  id,
  "juniorMarkId",
  jsonb_build_object(
    'id', id,
    'juniorMarkId', "juniorMarkId",
    'ut3', ut3,
    'ut4', ut4,
    'yearlynoteBook', "yearlynoteBook",
    'yearlysubEnrichment', "yearlysubEnrichment",
    'yearlyexamMarks', "yearlyexamMarks",
    'yearlyexamMarks40', "yearlyexamMarks40",
    'yearlyexamMarks30', "yearlyexamMarks30",
    'yearlytotalMarks', "yearlytotalMarks",
    'yearlygrade', "yearlygrade",
    'yearlyremarks', "yearlyremarks"
  ) as data
FROM "YearlyMarks";

-- Verify backup
SELECT COUNT(*) as total_records FROM "YearlyMarks";
SELECT COUNT(*) as backup_records FROM "YearlyMarks_backup";
SELECT COUNT(*) as ut4_records FROM "YearlyMarks_ut4_backup";
