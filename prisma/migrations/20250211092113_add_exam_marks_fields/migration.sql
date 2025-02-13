-- AlterTable
ALTER TABLE "HalfYearlyMarks" ADD COLUMN     "examMarks30" DOUBLE PRECISION,
ADD COLUMN     "examMarks40" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "YearlyMarks" ADD COLUMN     "yearlyexamMarks30" DOUBLE PRECISION,
ADD COLUMN     "yearlyexamMarks40" DOUBLE PRECISION;
