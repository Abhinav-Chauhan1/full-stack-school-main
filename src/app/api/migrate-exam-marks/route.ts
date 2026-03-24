/**
 * One-time migration: move examMarks40/yearlyexamMarks40 → examMarks30/yearlyexamMarks30
 * for subjects that are now 30-mark subjects (DRAW02, Comp01, GK01).
 * Also recalculates totals and grades using the correct 30-mark formula.
 *
 * POST /api/migrate-exam-marks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const THIRTY_MARK_SUBJECTS = ['DRAW02', 'Comp01', 'GK01', 'Urdu01', 'SAN01', 'PAI01'];

function calculateGrade(percentage: number): string {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
}

export async function POST(request: NextRequest) {
  try {
    // Find all junior marks for 30-mark subjects that still have examMarks40 set
    const marksToMigrate = await prisma.juniorMark.findMany({
      where: {
        classSubject: {
          subject: { code: { in: THIRTY_MARK_SUBJECTS } }
        },
        OR: [
          { halfYearly: { examMarks40: { not: null } } },
          { yearly: { yearlyexamMarks40: { not: null } } }
        ]
      },
      include: {
        halfYearly: true,
        yearly: true,
        classSubject: { include: { subject: { select: { code: true } } } }
      }
    });

    console.log(`Found ${marksToMigrate.length} records to migrate`);

    let updatedCount = 0;

    for (const mark of marksToMigrate) {
      const hy = mark.halfYearly;
      const yr = mark.yearly;

      let newHalfYearlyTotal: number | null = null;
      let newHalfYearlyGrade: string | null = null;
      let newYearlyTotal: number | null = null;
      let newYearlyGrade: string | null = null;

      // --- Migrate half yearly ---
      if (hy?.examMarks40 != null) {
        const ut1 = Math.min(10, hy.ut1 || 0);
        const ut2 = Math.min(10, hy.ut2 || 0);
        const bestUT = Math.max(ut1, ut2);
        const nb = Math.min(5, hy.noteBook || 0);
        const se = Math.min(5, hy.subEnrichment || 0);
        const exam30 = Math.min(30, hy.examMarks40); // value was stored in examMarks40

        newHalfYearlyTotal = bestUT + nb + se + exam30;
        newHalfYearlyGrade = calculateGrade((newHalfYearlyTotal / 50) * 100);

        await prisma.halfYearlyMarks.update({
          where: { id: hy.id },
          data: {
            examMarks30: exam30,
            examMarks40: null,
            totalMarks: newHalfYearlyTotal,
            grade: newHalfYearlyGrade
          }
        });
      } else if (hy) {
        newHalfYearlyTotal = hy.totalMarks ?? null;
        newHalfYearlyGrade = hy.grade ?? null;
      }

      // --- Migrate yearly ---
      if (yr?.yearlyexamMarks40 != null) {
        // Use best UT across both terms
        const hyUT1 = Math.min(10, hy?.ut1 || 0);
        const hyUT2 = Math.min(10, hy?.ut2 || 0);
        const hyBestUT = Math.max(hyUT1, hyUT2);
        const ut3 = Math.min(10, yr.ut3 || 0);
        const bestUT = Math.max(hyBestUT, ut3);

        const nb = Math.min(5, yr.yearlynoteBook || 0);
        const se = Math.min(5, yr.yearlysubEnrichment || 0);
        const exam30 = Math.min(30, yr.yearlyexamMarks40);

        newYearlyTotal = bestUT + nb + se + exam30;
        newYearlyGrade = calculateGrade((newYearlyTotal / 50) * 100);

        await prisma.yearlyMarks.update({
          where: { id: yr.id },
          data: {
            yearlyexamMarks30: exam30,
            yearlyexamMarks40: null,
            yearlytotalMarks: newYearlyTotal,
            yearlygrade: newYearlyGrade
          }
        });
      } else if (yr) {
        newYearlyTotal = yr.yearlytotalMarks ?? null;
        newYearlyGrade = yr.yearlygrade ?? null;
      }

      // --- Recalculate grand total ---
      if (newHalfYearlyTotal != null || newYearlyTotal != null) {
        const grandTotal = (newHalfYearlyTotal ?? 0) + (newYearlyTotal ?? 0);
        const termsCount = (newHalfYearlyTotal != null ? 1 : 0) + (newYearlyTotal != null ? 1 : 0);
        const maxPossible = termsCount * 50;
        const overallPct = maxPossible > 0 ? (grandTotal / maxPossible) * 100 : 0;

        await prisma.juniorMark.update({
          where: { id: mark.id },
          data: {
            grandTotalMarks: grandTotal,
            grandTotalGrade: calculateGrade(overallPct),
            overallPercentage: overallPct
          }
        });
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      totalFound: marksToMigrate.length,
      updatedCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
