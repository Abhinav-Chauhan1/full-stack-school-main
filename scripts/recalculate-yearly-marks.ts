/**
 * Recalculate yearly marks after UT4 removal
 * This script recalculates all yearly totals using the new logic:
 * - Best UT = max(halfYearly best UT, yearly UT3)
 * 
 * Run with: npx ts-node scripts/recalculate-yearly-marks.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to calculate grade
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

async function recalculateYearlyMarks() {
  try {
    console.log('Starting yearly marks recalculation...');

    // Fetch all JuniorMarks with both halfYearly and yearly data
    const juniorMarks = await prisma.juniorMark.findMany({
      where: {
        AND: [
          { halfYearly: { isNot: null } },
          { yearly: { isNot: null } }
        ]
      },
      include: {
        halfYearly: true,
        yearly: true,
        student: {
          select: {
            name: true,
            admissionno: true
          }
        },
        classSubject: {
          include: {
            subject: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${juniorMarks.length} records to recalculate`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const mark of juniorMarks) {
      try {
        const halfYearly = mark.halfYearly;
        const yearly = mark.yearly;
        const subjectCode = mark.classSubject.subject.code;

        if (!halfYearly || !yearly) continue;

        // Calculate best UT from half yearly
        const ut1 = Math.min(10, halfYearly.ut1 || 0);
        const ut2 = Math.min(10, halfYearly.ut2 || 0);
        const halfYearlyBestUT = Math.max(ut1, ut2);

        // Get yearly UT3
        const ut3 = Math.min(10, yearly.ut3 || 0);

        // Calculate overall best UT
        const overallBestUT = Math.max(halfYearlyBestUT, ut3);

        // Recalculate yearly total based on subject type
        let yearlyTotal = 0;
        let maxMarks = 100;

        const is40MarksSubject = ['Comp01', 'GK01', 'DRAW02'].includes(subjectCode);
        const is30MarksSubject = ['Urdu01', 'SAN01'].includes(subjectCode);

        if (is40MarksSubject) {
          maxMarks = 50;
          const roundedHalfUT = Math.round(overallBestUT / 2);
          const noteBookAndSubEnrichment = 
            Math.min(5, yearly.yearlynoteBook || 0) + 
            Math.min(5, yearly.yearlysubEnrichment || 0);
          const roundedHalfNBSE = Math.round(noteBookAndSubEnrichment / 2);
          yearlyTotal = roundedHalfUT + roundedHalfNBSE + Math.min(40, yearly.yearlyexamMarks40 || 0);
        } else if (is30MarksSubject) {
          maxMarks = 50;
          yearlyTotal = 
            overallBestUT +
            Math.min(5, yearly.yearlynoteBook || 0) +
            Math.min(5, yearly.yearlysubEnrichment || 0) +
            Math.min(30, yearly.yearlyexamMarks30 || 0);
        } else {
          maxMarks = 100;
          yearlyTotal = 
            overallBestUT +
            Math.min(5, yearly.yearlynoteBook || 0) +
            Math.min(5, yearly.yearlysubEnrichment || 0) +
            Math.min(80, yearly.yearlyexamMarks || 0);
        }

        // Calculate grade
        const percentage = (yearlyTotal / maxMarks) * 100;
        const grade = calculateGrade(percentage);

        // Update yearly marks
        await prisma.yearlyMarks.update({
          where: { id: yearly.id },
          data: {
            yearlytotalMarks: yearlyTotal,
            yearlygrade: grade
          }
        });

        // Recalculate grand total
        const halfYearlyMaxMarks = is40MarksSubject ? 50 : is30MarksSubject ? 50 : 100;
        const yearlyMaxMarks = maxMarks;
        const totalPossibleMarks = halfYearlyMaxMarks + yearlyMaxMarks;
        
        const grandTotalMarks = (halfYearly.totalMarks || 0) + yearlyTotal;
        const overallPercentage = (grandTotalMarks / totalPossibleMarks) * 100;
        const grandTotalGrade = calculateGrade(overallPercentage);

        // Update junior mark
        await prisma.juniorMark.update({
          where: { id: mark.id },
          data: {
            grandTotalMarks,
            grandTotalGrade,
            overallPercentage
          }
        });

        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          console.log(`Progress: ${updatedCount}/${juniorMarks.length} records updated`);
        }

      } catch (error) {
        console.error(`Error updating mark for student ${mark.student.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n✓ Recalculation completed!');
    console.log(`✓ Successfully updated: ${updatedCount} records`);
    if (errorCount > 0) {
      console.log(`✗ Errors encountered: ${errorCount} records`);
    }

  } catch (error) {
    console.error('Error recalculating yearly marks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recalculation
recalculateYearlyMarks()
  .then(() => {
    console.log('\n✓ Recalculation process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Recalculation process failed:', error);
    process.exit(1);
  });
