'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { convertStudentData } from './utils';
import { type Prisma } from '@prisma/client';

// Helper function to calculate junior marks totals
const calculateJuniorTotals = (marksJunior: any[]) => {
  if (!marksJunior || marksJunior.length === 0) {
    return { totalMarks: 0, maxPossibleMarks: 0, overallPercentage: 0 };
  }

  // Filter out language subjects to keep only the ones with marks
  const filteredMarks = marksJunior.filter(mark => {
    const hasMarks = (
      mark?.halfYearly?.totalMarks > 0 || 
      mark?.yearly?.yearlytotalMarks > 0
    );
    return hasMarks;
  });

  const totals = filteredMarks.reduce((acc, mark) => {
    const subject = mark?.classSubject?.subject;
    const isFortyMarksSubject = subject?.code?.match(/^(Comp01|GK01|DRAW02)$/);
    const isThirtyMarksSubject = subject?.code?.match(/^(Urdu01|SAN01)$/);
    
    // Calculate max marks per term based on subject type
    let maxMarksPerTerm = isFortyMarksSubject ? 50 : isThirtyMarksSubject ? 50 : 100;
    
    const halfYearlyMarks = mark.halfYearly?.totalMarks || 0;
    const yearlyMarks = mark.yearly?.yearlytotalMarks || 0;
    acc.totalMarks += (halfYearlyMarks + yearlyMarks);
    acc.maxPossibleMarks += (maxMarksPerTerm * 2); // multiply by 2 for both terms
    return acc;
  }, { totalMarks: 0, maxPossibleMarks: 0 });

  const overallPercentage = totals.maxPossibleMarks > 0 
    ? Number((totals.totalMarks / totals.maxPossibleMarks * 100).toFixed(2))
    : 0;

  return { ...totals, overallPercentage };
};

// Helper function to calculate senior marks totals
const calculateSeniorTotals = (marksSenior: any[]) => {
  if (!marksSenior || marksSenior.length === 0) {
    return { totalObtained: 0, totalMarks: 0, overallPercentage: 0 };
  }

  // Separate IT001 marks from other subjects
  const regularMarks = marksSenior.filter(mark => mark.sectionSubject?.subject?.code !== 'IT001');
  const itMarks = marksSenior.find(mark => mark.sectionSubject?.subject?.code === 'IT001');

  // Calculate totals for regular subjects
  let totalObtained = 0;
  let totalMarks = 0;
  
  regularMarks.forEach(mark => {
    if (mark.grandTotal) {
      totalObtained += mark.grandTotal;
      totalMarks += 100;
    }
  });

  // Add IT marks to the total if available
  if (itMarks?.total) {
    totalObtained += itMarks.total;
    totalMarks += 100;
  }
  
  const overallPercentage = totalMarks > 0 
    ? Number((totalObtained / totalMarks * 100).toFixed(2))
    : 0;

  return { totalObtained, totalMarks, overallPercentage };
};

// Helper function to calculate higher marks totals
const calculateHigherTotals = (marksHigher: any[]) => {
  if (!marksHigher || marksHigher.length === 0) {
    return { totalObtained: 0, totalMarks: 0, overallPercentage: 0 };
  }

  let totalObtained = 0;
  let totalMarks = 0;

  marksHigher.forEach(mark => {
    // Check if we have a PAI02 subject (Painting)
    const isPaintingSubject = mark?.sectionSubject?.subject?.code === 'PAI02';
    
    if (isPaintingSubject) {
      if (mark.grandTotal) {
        totalObtained += mark.grandTotal;
        totalMarks += 100;
      } else if (mark.theory30 !== null || mark.practical70 !== null) {
        const theory30 = mark.theory30 || 0;
        const practical70 = mark.practical70 || 0;
        totalObtained += (theory30 + practical70);
        totalMarks += 100;
      }
    } else if (mark.grandTotal) {
      totalObtained += mark.grandTotal;
      totalMarks += 100;
    }
  });

  const overallPercentage = totalMarks > 0 ? 
    Number((totalObtained / totalMarks * 100).toFixed(2)) : 0;

  return { totalObtained, totalMarks, overallPercentage };
};

export async function importStudentsWithMarks({ 
  students, 
  classId, 
  sectionId,
  sessionId
}: { 
  students: any[], 
  classId: number, 
  sectionId: number,
  sessionId: number
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const createdStudents = await Promise.all(students.map(async (student) => {
        const convertedStudent = convertStudentData(student);
        
        const studentCreateInput: Prisma.StudentCreateInput = {
          ...convertedStudent,
          Class: {
            connect: { id: classId }
          },
          Section: {
            connect: { id: sectionId }
          },
          Session: {
            connect: { id: sessionId }
          }
        };

        return await tx.student.create({
          data: studentCreateInput
        });
      }));

      revalidatePath('/list/students');
      return { success: true, data: createdStudents };
    });
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error importing students' 
    };
  }
}

export async function exportStudentsWithMarks(
  classId: number, 
  sectionId: number, 
  sessionId: number
) {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
        sessionId,
      },
      select: {
        admissiondate: true,
        admissionno: true,
        name: true,
        address: true,
        city: true,
        village: true,
        Sex: true,
        birthday: true,
        nationality: true,
        Religion: true,
        tongue: true,
        category: true,
        mothername: true,
        mphone: true,
        moccupation: true,
        fathername: true,
        fphone: true,
        foccupation: true,
        aadharcard: true,
        house: true,
        bloodgroup: true,
        previousClass: true,
        yearofpass: true,
        board: true,
        school: true,
        grade: true,
        // Include marks data for calculations
        marksJunior: {
          include: {
            halfYearly: true,
            yearly: true,
            classSubject: {
              include: {
                subject: true
              }
            }
          },
        },
        marksSenior: {
          include: {
            sectionSubject: {
              include: {
                subject: true
              }
            }
          }
        },
        markHigher: {
          include: {
            sectionSubject: {
              include: {
                subject: true
              }
            }
          }
        },
        Class: {
          select: {
            classNumber: true
          }
        }
      },
    });

    // Transform dates to YYYY-MM-DD format for Excel
    const formattedStudents = students.map(student => {
      // Calculate marks totals based on class level
      let totalMarks = 0;
      let totalMaxMarks = 0;
      let overallPercentage = 0;
      
      const classNumber = student.Class?.classNumber || 0;
      
      if (classNumber <= 8) {
        // Junior marks (Classes 1-8)
        const { totalMarks: juniorTotal, maxPossibleMarks, overallPercentage: juniorPercentage } = 
          calculateJuniorTotals(student.marksJunior);
        totalMarks = juniorTotal;
        totalMaxMarks = maxPossibleMarks;
        overallPercentage = juniorPercentage;
      } else if (classNumber <= 10) {
        // Senior marks (Classes 9-10)
        const { totalObtained, totalMarks: seniorMaxMarks, overallPercentage: seniorPercentage } = 
          calculateSeniorTotals(student.marksSenior);
        totalMarks = totalObtained;
        totalMaxMarks = seniorMaxMarks;
        overallPercentage = seniorPercentage;
      } else {
        // Higher marks (Classes 11-12)
        const { totalObtained, totalMarks: higherMaxMarks, overallPercentage: higherPercentage } = 
          calculateHigherTotals(student.markHigher);
        totalMarks = totalObtained;
        totalMaxMarks = higherMaxMarks;
        overallPercentage = higherPercentage;
      }

      // Exclude marks arrays from export but add calculated totals
      const { marksJunior, marksSenior, markHigher, ...studentData } = student;
      
      return {
        ...studentData,
        admissiondate: student.admissiondate.toISOString().split('T')[0],
        birthday: student.birthday.toISOString().split('T')[0],
        totalMarks: totalMarks,
        totalMaxMarks: totalMaxMarks,
        overallPercentage: overallPercentage,
        overallGrade: getOverallGrade(overallPercentage)
      };
    });

    return { success: true, data: formattedStudents };
  } catch (error) {
    console.error('Export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error exporting students' 
    };
  }
}

export async function exportAllStudents(sessionId: number) {
  try {
    const students = await prisma.student.findMany({
      where: {
        sessionId,
      },
      select: {
        admissiondate: true,
        admissionno: true,
        name: true,
        address: true,
        city: true,
        village: true,
        Sex: true,
        birthday: true,
        nationality: true,
        Religion: true,
        tongue: true,
        category: true,
        mothername: true,
        mphone: true,
        moccupation: true,
        fathername: true,
        fphone: true,
        foccupation: true,
        aadharcard: true,
        house: true,
        bloodgroup: true,
        previousClass: true,
        yearofpass: true,
        board: true,
        school: true,
        grade: true,
        Class: {
          select: {
            name: true,
            classNumber: true
          }
        },
        Section: {
          select: {
            name: true
          }
        },
        // Include marks data for calculations
        marksJunior: {
          include: {
            halfYearly: true,
            yearly: true,
            classSubject: {
              include: {
                subject: true
              }
            }
          },
        },
        marksSenior: {
          include: {
            sectionSubject: {
              include: {
                subject: true
              }
            }
          }
        },
        markHigher: {
          include: {
            sectionSubject: {
              include: {
                subject: true
              }
            }
          }
        }
      },
      orderBy: [
        { Class: { classNumber: 'asc' } },
        { Section: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Group students by class and section
    const grouped = students.reduce((acc, student) => {
      const sheetName = `${student.Class?.name}-${student.Section?.name}`;
      if (!acc[sheetName]) {
        acc[sheetName] = [];
      }

      // Calculate marks totals based on class level
      let totalMarks = 0;
      let totalMaxMarks = 0;
      let overallPercentage = 0;
      
      const classNumber = student.Class?.classNumber || 0;
      
      if (classNumber <= 8) {
        // Junior marks (Classes 1-8)
        const { totalMarks: juniorTotal, maxPossibleMarks, overallPercentage: juniorPercentage } = 
          calculateJuniorTotals(student.marksJunior);
        totalMarks = juniorTotal;
        totalMaxMarks = maxPossibleMarks;
        overallPercentage = juniorPercentage;
      } else if (classNumber <= 10) {
        // Senior marks (Classes 9-10)
        const { totalObtained, totalMarks: seniorMaxMarks, overallPercentage: seniorPercentage } = 
          calculateSeniorTotals(student.marksSenior);
        totalMarks = totalObtained;
        totalMaxMarks = seniorMaxMarks;
        overallPercentage = seniorPercentage;
      } else {
        // Higher marks (Classes 11-12)
        const { totalObtained, totalMarks: higherMaxMarks, overallPercentage: higherPercentage } = 
          calculateHigherTotals(student.markHigher);
        totalMarks = totalObtained;
        totalMaxMarks = higherMaxMarks;
        overallPercentage = higherPercentage;
      }

      // Format dates and remove Class/Section from student data
      const { Class, Section, marksJunior, marksSenior, markHigher, admissiondate, birthday, ...rest } = student;
      acc[sheetName].push({
        ...rest,
        admissiondate: admissiondate.toISOString().split('T')[0],
        birthday: birthday.toISOString().split('T')[0],
        totalMarks: totalMarks,
        totalMaxMarks: totalMaxMarks,
        overallPercentage: overallPercentage,
        overallGrade: getOverallGrade(overallPercentage)
      });

      return acc;
    }, {} as Record<string, any[]>);

    return { success: true, data: grouped };
  } catch (error) {
    console.error('Export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error exporting students' 
    };
  }
}

// Helper function to get grade based on percentage, reused from pdfUtils
function getOverallGrade(percentage: number) {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
}
