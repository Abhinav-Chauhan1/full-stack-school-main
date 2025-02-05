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
    const updatePromises = data.marks.map(async (mark) => {
      const examType = mark.examType;
      const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

      if (!marksData) return null;

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

      if (!existingMark) {
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

      return prisma.juniorMark.update({
        where: {
          id: existingMark.id
        },
        data: {
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

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Junior Marks Error:", err);
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

export const recalculateJuniorMarks = async (markData: any) => {
  try {
    const results = calculateMarksAndGrade(markData);
    
    // Update the mark record with calculated values
    await prisma.juniorMark.update({
      where: {
        studentId_classSubjectId_sessionId: {
          studentId: markData.studentId,
          classSubjectId: markData.classSubjectId,
          sessionId: markData.sessionId
        }
      },
      data: {
        [markData.examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
          update: {
            // Update half yearly marks
            ...(markData.examType === "HALF_YEARLY" ? {
              totalMarks: results.totalMarks,
              grade: results.grade
            } : {
              // Update yearly marks
              yearlytotalMarks: results.totalMarks,
              yearlygrade: results.grade
            })
          }
        },
        // Update grand total if it's yearly exam
        ...(markData.examType === "YEARLY" && {
          grandTotalMarks: results.grandTotalMarks,
          grandTotalGrade: results.grandTotalGrade,
          overallPercentage: results.overallPercentage
        })
      }
    });

    return {
      success: true,
      error: false,
      results
    };
  } catch (err) {
    console.error("Recalculate Marks Error:", err);
    return {
      success: false,
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const recalculateAllJuniorMarks = async (
  classId?: number, 
  sectionId?: number, 
  sessionId?: number
) => {
  try {
    // Build where clause based on provided filters
    const where: any = {};
    if (classId) where.classSubject = { classId };
    if (sectionId) where.student = { sectionId };
    if (sessionId) where.sessionId = sessionId;

    // Get all marks matching the criteria
    const marks = await prisma.juniorMark.findMany({
      where,
      include: {
        halfYearly: true,
        yearly: true
      }
    });

    // Process each mark
    const updatePromises = marks.map(async (mark) => {
      // Calculate half yearly marks if they exist
      if (mark.halfYearly) {
        await recalculateJuniorMarks({
          ...mark,
          examType: "HALF_YEARLY"
        });
      }

      // Calculate yearly marks if they exist
      if (mark.yearly) {
        await recalculateJuniorMarks({
          ...mark,
          examType: "YEARLY"
        });
      }
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      error: false,
      message: `Successfully recalculated ${marks.length} mark records`
    };
  } catch (err) {
    console.error("Recalculate All Marks Error:", err);
    return {
      success: false,
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
