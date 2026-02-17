/**
 * Export UT4 data to JSON file before migration
 * Run with: npx ts-node scripts/export-ut4-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportUT4Data() {
  try {
    console.log('Starting UT4 data export...');

    // Fetch all YearlyMarks with UT4 data
    const yearlyMarks = await prisma.yearlyMarks.findMany({
      where: {
        ut4: {
          not: null
        }
      },
      include: {
        juniorMark: {
          include: {
            student: {
              select: {
                id: true,
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
                },
                class: {
                  select: {
                    name: true
                  }
                }
              }
            },
            session: {
              select: {
                sessioncode: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${yearlyMarks.length} records with UT4 data`);

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `ut4_data_backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: yearlyMarks.length,
      description: 'Backup of UT4 data before migration to remove UT4 field',
      data: yearlyMarks.map(mark => ({
        id: mark.id,
        juniorMarkId: mark.juniorMarkId,
        student: {
          id: mark.juniorMark.student.id,
          name: mark.juniorMark.student.name,
          admissionno: mark.juniorMark.student.admissionno
        },
        class: mark.juniorMark.classSubject.class.name,
        subject: {
          name: mark.juniorMark.classSubject.subject.name,
          code: mark.juniorMark.classSubject.subject.code
        },
        session: mark.juniorMark.session.sessioncode,
        marks: {
          ut3: mark.ut3,
          ut4: mark.ut4,
          yearlynoteBook: mark.yearlynoteBook,
          yearlysubEnrichment: mark.yearlysubEnrichment,
          yearlyexamMarks: mark.yearlyexamMarks,
          yearlyexamMarks40: mark.yearlyexamMarks40,
          yearlyexamMarks30: mark.yearlyexamMarks30,
          yearlytotalMarks: mark.yearlytotalMarks,
          yearlygrade: mark.yearlygrade,
          yearlyremarks: mark.yearlyremarks
        }
      }))
    };

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    console.log(`✓ Export completed successfully!`);
    console.log(`✓ File saved to: ${filepath}`);
    console.log(`✓ Total records exported: ${yearlyMarks.length}`);

    // Create a summary CSV for easy viewing
    const csvFilename = `ut4_data_summary_${timestamp}.csv`;
    const csvFilepath = path.join(backupDir, csvFilename);
    
    const csvHeader = 'Student Name,Admission No,Class,Subject,Session,UT3,UT4,Total Marks,Grade\n';
    const csvRows = yearlyMarks.map(mark => 
      `"${mark.juniorMark.student.name}",${mark.juniorMark.student.admissionno},"${mark.juniorMark.classSubject.class.name}","${mark.juniorMark.classSubject.subject.name}","${mark.juniorMark.session.sessioncode}",${mark.ut3 || ''},${mark.ut4 || ''},${mark.yearlytotalMarks || ''},${mark.yearlygrade || ''}`
    ).join('\n');
    
    fs.writeFileSync(csvFilepath, csvHeader + csvRows);
    console.log(`✓ CSV summary saved to: ${csvFilepath}`);

  } catch (error) {
    console.error('Error exporting UT4 data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportUT4Data()
  .then(() => {
    console.log('\n✓ Export process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Export process failed:', error);
    process.exit(1);
  });
