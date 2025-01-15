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
    const createPromises = data.marks.map(async (mark) => {
      // Check if it's IT001 subject
      const subject = await prisma.sectionSubject.findUnique({
        where: { id: mark.sectionSubjectId },
        include: { subject: true }
      });

      if (subject?.subject.code === "IT001") {
        const total = mark.theory && mark.practical ? 
          Number(mark.theory) + Number(mark.practical) : null;

        let grade = null;
        if (total !== null) {
          if (total >= 91) grade = 'A1';
          else if (total >= 81) grade = 'A2';
          else if (total >= 71) grade = 'B1';
          else if (total >= 61) grade = 'B2';
          else if (total >= 51) grade = 'C1';
          else if (total >= 41) grade = 'C2';
          else if (total >= 33) grade = 'D';
          else grade = 'E';
        }

        return prisma.seniorMark.create({
          data: {
            studentId: mark.studentId,
            sectionSubjectId: mark.sectionSubjectId,
            sessionId: mark.sessionId,
            theory: mark.theory,
            practical: mark.practical,
            total,
            grade,
            overallTotal: total,
            overallMarks: total,
            overallGrade: grade,
            remarks: mark.remarks
          }
        });
      }

      const isVocationalIT = subject?.subject.code === "IT001";
      
      let markData: {
        studentId: string;
        sectionSubjectId: number;
        sessionId: number;
        remarks: string | null | undefined;
        theory?: number | null;
        practical?: number | null;
        total?: number | null;
        pt1?: number | null;
        pt2?: number | null;
        pt3?: number | null;
        multipleAssessment?: number | null;
        portfolio?: number | null;
        subEnrichment?: number | null;
        finalExam?: number | null;
        bestTwoPTAvg?: number | null;
        bestScore?: number | null;
        grandTotal?: number | null;
        grade?: string | null;
        overallTotal?: number | null;
        overallMarks?: number | null;
        overallGrade?: string | null;
      } = {
        studentId: mark.studentId,
        sectionSubjectId: mark.sectionSubjectId,
        sessionId: mark.sessionId,
        remarks: mark.remarks
      };

      if (isVocationalIT) {
        // For IT001
        markData = {
          ...markData,
          theory: mark.theory,
          practical: mark.practical,
          total: mark.theory && mark.practical ? Number(mark.theory) + Number(mark.practical) : null
        };
      } else {
        // For regular subjects
        const calculations = calculateSeniorMarksAndGrade(mark);
        markData = {
          ...markData,
          ...calculations,
          pt1: mark.pt1,
          pt2: mark.pt2,
          pt3: mark.pt3,
          multipleAssessment: mark.multipleAssessment,
          portfolio: mark.portfolio,
          subEnrichment: mark.subEnrichment,
          finalExam: mark.finalExam
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

    await Promise.all(createPromises);
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
