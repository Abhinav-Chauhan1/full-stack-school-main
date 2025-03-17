"use server";

import { PrismaClient } from '@prisma/client';
import { HigherMarkSchema } from '@/lib/formValidationSchemas';
import { calculateHigherMarksAndGrade } from '@/lib/markCalculations';

const prisma = new PrismaClient();

export const checkExistingHigherMarks = async (
  data: { 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    const existingMarks = await prisma.higherMark.findMany({
      where: {
        sectionSubjectId: data.sectionSubjectId,
        sessionId: data.sessionId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionno: true,
          }
        }
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createHigherMarks = async (data: { marks: (HigherMarkSchema & { subjectCode?: string })[] }) => {
  try {
    const createPromises = data.marks
      .filter(mark => {
        const isPaintingSubject = mark.subjectCode === 'PAI02';
        if (isPaintingSubject) {
          return mark.theory30 !== null || mark.practical70 !== null;
        }
        return mark.unitTest1 !== null || 
               mark.halfYearly !== null || 
               mark.unitTest2 !== null ||
               mark.theory !== null ||
               mark.practical !== null;
      })
      .map(async (mark) => {
        // Get subject code if not provided
        if (!mark.subjectCode) {
          const subject = await prisma.sectionSubject.findUnique({
            where: { id: mark.sectionSubjectId },
            include: { subject: true }
          });
          mark.subjectCode = subject?.subject.code || null;
        }
        
        const calculations = calculateHigherMarksAndGrade(mark);
        
        const isPaintingSubject = mark.subjectCode === 'PAI02';
        
        return prisma.higherMark.create({
          data: {
            student: { connect: { id: mark.studentId }},
            sectionSubject: { connect: { id: mark.sectionSubjectId }},
            session: { connect: { id: mark.sessionId }},
            
            // Set appropriate fields based on subject type
            unitTest1: isPaintingSubject ? null : mark.unitTest1,
            halfYearly: isPaintingSubject ? null : mark.halfYearly,
            unitTest2: isPaintingSubject ? null : mark.unitTest2,
            theory: isPaintingSubject ? null : mark.theory,
            practical: isPaintingSubject ? null : mark.practical,
            
            // PAI02 specific fields
            theory30: isPaintingSubject ? mark.theory30 : null,
            practical70: isPaintingSubject ? mark.practical70 : null,
            
            // Common fields
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade,
            remarks: mark.remarks
          }
        });
    });

    await Promise.all(createPromises);
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateHigherMarks = async (data: { marks: (HigherMarkSchema & { subjectCode?: string })[] }) => {
  try {
    const updatePromises = data.marks
      .filter(mark => {
        const isPaintingSubject = mark.subjectCode === 'PAI02';
        if (isPaintingSubject) {
          return mark.theory30 !== null || mark.practical70 !== null;
        }
        return mark.unitTest1 !== null || 
               mark.halfYearly !== null || 
               mark.unitTest2 !== null ||
               mark.theory !== null ||
               mark.practical !== null;
      })
      .map(async (mark) => {
        // Get subject code if not provided
        if (!mark.subjectCode) {
          const subject = await prisma.sectionSubject.findUnique({
            where: { id: mark.sectionSubjectId },
            include: { subject: true }
          });
          mark.subjectCode = subject?.subject.code || null;
        }
        
        const calculations = calculateHigherMarksAndGrade(mark);
        const isPaintingSubject = mark.subjectCode === 'PAI02';

        return prisma.higherMark.upsert({
          where: {
            studentId_sectionSubjectId_sessionId: {
              studentId: mark.studentId,
              sectionSubjectId: mark.sectionSubjectId,
              sessionId: mark.sessionId
            }
          },
          create: {
            student: { connect: { id: mark.studentId }},
            sectionSubject: { connect: { id: mark.sectionSubjectId }},
            session: { connect: { id: mark.sessionId }},
            
            // Set appropriate fields based on subject type
            unitTest1: isPaintingSubject ? null : mark.unitTest1,
            halfYearly: isPaintingSubject ? null : mark.halfYearly,
            unitTest2: isPaintingSubject ? null : mark.unitTest2,
            theory: isPaintingSubject ? null : mark.theory,
            practical: isPaintingSubject ? null : mark.practical,
            
            // PAI02 specific fields
            theory30: isPaintingSubject ? mark.theory30 : null,
            practical70: isPaintingSubject ? mark.practical70 : null,
            
            // Common fields
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade,
            remarks: mark.remarks
          },
          update: {
            // Set appropriate fields based on subject type
            unitTest1: isPaintingSubject ? null : mark.unitTest1,
            halfYearly: isPaintingSubject ? null : mark.halfYearly,
            unitTest2: isPaintingSubject ? null : mark.unitTest2,
            theory: isPaintingSubject ? null : mark.theory,
            practical: isPaintingSubject ? null : mark.practical,
            
            // PAI02 specific fields
            theory30: isPaintingSubject ? mark.theory30 : null,
            practical70: isPaintingSubject ? mark.practical70 : null,
            
            // Common fields
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade,
            remarks: mark.remarks
          }
        });
    });

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteHigherMark = async (
  data: { 
    studentId: string, 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    await prisma.higherMark.delete({
      where: {
        studentId_sectionSubjectId_sessionId: {
          studentId: data.studentId,
          sectionSubjectId: data.sectionSubjectId,
          sessionId: data.sessionId
        }
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Mark deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Higher Mark Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
