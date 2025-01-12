"use server";

import { PrismaClient } from '@prisma/client';
import { SeniorMarkSchema } from "@/lib/formValidationSchemas";
import { calculateSeniorMarksAndGrade } from '@/lib/formValidationSchemas';

const prisma = new PrismaClient();

export const checkExistingSeniorMarks = async (
  data: { 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    const existingMarks = await prisma.seniorMark.findMany({
      where: {
        sectionSubjectId: data.sectionSubjectId,
        sessionId: data.sessionId
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createSeniorMarks = async (data: { marks: SeniorMarkSchema[] }) => {
  try {
    const createPromises = data.marks
      .filter(mark => {
        if (!mark) return false;
        
        // Handle both regular and IT001 marks
        const hasRegularMarks = 
          typeof mark.pt1 === 'number' || 
          typeof mark.pt2 === 'number' || 
          typeof mark.pt3 === 'number' || 
          typeof mark.multipleAssessment === 'number' ||
          typeof mark.portfolio === 'number' ||
          typeof mark.subEnrichment === 'number' ||
          typeof mark.finalExam === 'number';

        const hasITMarks = 
          typeof mark.theory === 'number' || 
          typeof mark.practical === 'number';

        return hasRegularMarks || hasITMarks;
      })
      .map(async (mark) => {
        const subject = await prisma.sectionSubject.findUnique({
          where: { id: mark.sectionSubjectId },
          include: { subject: true }
        });

        const isVocationalIT = subject?.subject.code === "IT001";
        const calculations = calculateSeniorMarksAndGrade(mark);

        const baseData = {
          studentId: mark.studentId,
          sectionSubjectId: mark.sectionSubjectId,
          sessionId: mark.sessionId,
          remarks: mark.remarks || null
        };

        const markData = isVocationalIT ? {
          ...baseData,
          theory: mark.theory || null,
          practical: mark.practical || null,
          total: (mark.theory && mark.practical) ? 
            Number(mark.theory) + Number(mark.practical) : null,
          // Reset regular fields
          pt1: null, pt2: null, pt3: null,
          bestTwoPTAvg: null, multipleAssessment: null,
          portfolio: null, subEnrichment: null,
          bestScore: null, finalExam: null,
          grandTotal: null, grade: null,
          overallTotal: null, overallMarks: null,
          overallGrade: null
        } : {
          ...baseData,
          // Reset IT fields
          theory: null,
          practical: null,
          total: null,
          // Set regular fields
          pt1: mark.pt1 || null,
          pt2: mark.pt2 || null,
          pt3: mark.pt3 || null,
          bestTwoPTAvg: calculations.bestTwoPTAvg,
          multipleAssessment: mark.multipleAssessment || null,
          portfolio: mark.portfolio || null,
          subEnrichment: mark.subEnrichment || null,
          bestScore: calculations.bestScore,
          finalExam: mark.finalExam || null,
          grandTotal: calculations.grandTotal,
          grade: calculations.grade,
          overallTotal: calculations.overallTotal,
          overallMarks: calculations.overallMarks,
          overallGrade: calculations.overallGrade
        };

        try {
          return await prisma.seniorMark.upsert({
            where: {
              studentId_sectionSubjectId_sessionId: {
                studentId: mark.studentId,
                sectionSubjectId: mark.sectionSubjectId,
                sessionId: mark.sessionId
              }
            },
            create: markData,
            update: markData
          });
        } catch (error) {
          console.error('Error upserting mark:', error);
          throw error;
        }
      });

    const results = await Promise.allSettled(createPromises);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.error('Some marks failed to save:', failures);
      return { 
        success: false, 
        error: true,
        message: "Some marks failed to save" 
      };
    }

    return { success: true, error: false };
  } catch (err) {
    console.error("Create Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateSeniorMarks = async (data: { marks: SeniorMarkSchema[] }) => {
  try {
    const updatePromises = data.marks
      .filter(mark => {
        // Filter out empty entries
        const hasTheoryPractical = mark.theory !== null || mark.practical !== null;
        const hasRegularMarks = mark.pt1 !== null || 
                               mark.pt2 !== null || 
                               mark.pt3 !== null || 
                               mark.multipleAssessment !== null ||
                               mark.portfolio !== null ||
                               mark.subEnrichment !== null ||
                               mark.finalExam !== null;
        return hasTheoryPractical || hasRegularMarks;
      })
      .map(async (mark) => {
        const subject = await prisma.sectionSubject.findUnique({
          where: { id: mark.sectionSubjectId },
          include: { subject: true }
        });

        const isVocationalIT = subject?.subject.code === "IT001";
        const calculations = calculateSeniorMarksAndGrade(mark);

        let markData: any = {
          studentId: mark.studentId,
          sectionSubjectId: mark.sectionSubjectId,
          sessionId: mark.sessionId,
          remarks: mark.remarks
        };

        if (isVocationalIT) {
          // For IT001 subject
          markData = {
            ...markData,
            theory: mark.theory,
            practical: mark.practical,
            total: mark.theory && mark.practical ? mark.theory + mark.practical : null,
            // Reset regular subject fields
            pt1: null, pt2: null, pt3: null,
            bestTwoPTAvg: null, multipleAssessment: null,
            portfolio: null, subEnrichment: null,
            bestScore: null, finalExam: null,
            grandTotal: null, grade: null,
            overallTotal: null, overallMarks: null,
            overallGrade: null
          };
        } else {
          // For regular subjects
          markData = {
            ...markData,
            // Reset IT fields
            theory: null,
            practical: null,
            total: null,
            // Set regular subject fields
            pt1: mark.pt1,
            pt2: mark.pt2,
            pt3: mark.pt3,
            bestTwoPTAvg: calculations.bestTwoPTAvg,
            multipleAssessment: mark.multipleAssessment,
            portfolio: mark.portfolio,
            subEnrichment: mark.subEnrichment,
            bestScore: calculations.bestScore,
            finalExam: mark.finalExam,
            grandTotal: calculations.grandTotal,
            grade: calculations.grade,
            overallTotal: calculations.overallTotal,
            overallMarks: calculations.overallMarks,
            overallGrade: calculations.overallGrade
          };
        }

        return prisma.seniorMark.upsert({
          where: {
            studentId_sectionSubjectId_sessionId: {
              studentId: mark.studentId,
              sectionSubjectId: mark.sectionSubjectId,
              sessionId: mark.sessionId
            }
          },
          create: markData,
          update: markData
        });
      });

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteSeniorMark = async (
  data: { 
    studentId: string, 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    await prisma.seniorMark.delete({
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
    console.error("Delete Senior Mark Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
