"use server";

import { PrismaClient } from '@prisma/client';
import { JuniorMarkSchema } from "@/lib/formValidationSchemas";
import { calculateMarksAndGrade } from '@/lib/formValidationSchemas';

const prisma = new PrismaClient();

export const checkExistingJuniorMarks = async (
  data: { 
    classSubjectId: number, 
    sessionId: number, 
    examType: "HALF_YEARLY" | "YEARLY",
    sectionId: number // Add sectionId to the data parameter
  }
) => {
  try {
    if (!data.classSubjectId || !data.sessionId || !data.examType || !data.sectionId) { // Add sectionId check
      return { 
        success: false, 
        error: true,
        message: "Missing required fields"
      };
    }

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: data.classSubjectId }
    });

    if (!classSubject) {
      return {
        success: false,
        error: true,
        message: "Could not find matching Class Subject"
      };
    }

    const existingMarks = await prisma.juniorMark.findMany({
      where: {
        classSubjectId: data.classSubjectId,
        sessionId: data.sessionId,
        student: {
          sectionId: data.sectionId // Add section filter
        },
        [data.examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
          isNot: null
        }
      },
      include: {
        halfYearly: true,
        yearly: true
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createJuniorMarks = async (data: { marks: JuniorMarkSchema[] }) => {
  try {
    const createPromises = data.marks.map(async (mark) => {
      const examType = mark.examType;
      const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

      if (!marksData) return null;

      // Use upsert instead of create
      return prisma.juniorMark.upsert({
        where: {
          studentId_classSubjectId_sessionId: {
            studentId: mark.studentId,
            classSubjectId: mark.classSubjectId,
            sessionId: mark.sessionId
          }
        },
        create: {
          student: { connect: { id: mark.studentId }},
          classSubject: { connect: { id: mark.classSubjectId }},
          session: { connect: { id: mark.sessionId }},
          [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
            create: marksData
          },
          grandTotalMarks: mark.grandTotalMarks || 0,
          grandTotalGrade: mark.grandTotalGrade || '',
          overallPercentage: mark.overallPercentage || 0
        },
        update: {
          [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
            upsert: {
              create: marksData,
              update: marksData
            }
          },
          grandTotalMarks: mark.grandTotalMarks || 0,
          grandTotalGrade: mark.grandTotalGrade || '',
          overallPercentage: mark.overallPercentage || 0
        }
      });
    });

    await Promise.all(createPromises);
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateJuniorMarks = async (data: { marks: JuniorMarkSchema[] }) => {
  try {
    console.log('Update function called with data:', JSON.stringify(data, null, 2));

    const updatePromises = data.marks.map(async (mark) => {
      console.log('Processing mark:', JSON.stringify(mark, null, 2));
      
      const examType = mark.examType;
      const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

      if (!marksData) {
        console.log('No marks data found for:', mark.studentId);
        return null;
      }

      // First, check if the record exists
      const existingMark = await prisma.juniorMark.findUnique({
        where: {
          studentId_classSubjectId_sessionId: {
            studentId: mark.studentId,
            classSubjectId: mark.classSubjectId,
            sessionId: mark.sessionId
          }
        },
        include: {
          halfYearly: true,
          yearly: true
        }
      });

      console.log('Existing mark found:', existingMark ? 'yes' : 'no');

      if (existingMark) {
        console.log('Attempting to update existing mark for student:', mark.studentId);
        return prisma.juniorMark.update({
          where: {
            id: existingMark.id
          },
          data: {
            [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
              upsert: {
                create: marksData,
                update: marksData,
              }
            },
            grandTotalMarks: mark.grandTotalMarks || 0,
            grandTotalGrade: mark.grandTotalGrade || '',
            overallPercentage: mark.overallPercentage || 0
          }
        });
      } else {
        console.log('Creating new mark record for student:', mark.studentId);
        return prisma.juniorMark.create({
          data: {
            student: { connect: { id: mark.studentId }},
            classSubject: { connect: { id: mark.classSubjectId }},
            session: { connect: { id: mark.sessionId }},
            [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
              create: marksData
            },
            grandTotalMarks: mark.grandTotalMarks || 0,
            grandTotalGrade: mark.grandTotalGrade || '',
            overallPercentage: mark.overallPercentage || 0
          }
        });
      }
    });

    const results = await Promise.all(updatePromises);
    console.log('Update operation completed. Results:', JSON.stringify(results, null, 2));
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Junior Marks Error:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : 'No stack trace');
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteJuniorMark = async (
  data: { 
    studentId: string, 
    classSubjectId: number, 
    sessionId: number, 
    examType: "HALF_YEARLY" | "YEARLY" 
  }
) => {
  try {
    if (!data.studentId || !data.classSubjectId || !data.sessionId || !data.examType) {
      return { 
        success: false, 
        error: true,
        message: "Missing required fields" 
      };
    }

    const juniorMark = await prisma.juniorMark.findUnique({
      where: {
        studentId_classSubjectId_sessionId: {
          studentId: data.studentId,
          classSubjectId: data.classSubjectId,
          sessionId: data.sessionId
        }
      },
      include: {
        halfYearly: true,
        yearly: true
      }
    });

    if (!juniorMark) {
      return { 
        success: false, 
        error: true,
        message: "Mark record not found" 
      };
    }

    await prisma.$transaction(async (prisma) => {
      if (data.examType === "HALF_YEARLY" && juniorMark.halfYearly) {
        await prisma.halfYearlyMarks.delete({
          where: { juniorMarkId: juniorMark.id }
        });
      } else if (data.examType === "YEARLY" && juniorMark.yearly) {
        await prisma.yearlyMarks.delete({
          where: { juniorMarkId: juniorMark.id }
        });
      }

      const shouldDeleteParent = data.examType === "HALF_YEARLY" ? 
        !juniorMark.yearly : !juniorMark.halfYearly;

      if (shouldDeleteParent) {
        await prisma.juniorMark.delete({
          where: { id: juniorMark.id }
        });
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Marks deleted successfully" 
    };

  } catch (err) {
    console.error("Delete Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
