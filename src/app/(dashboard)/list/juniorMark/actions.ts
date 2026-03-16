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
        yearly: true,
        student: {
          select: {
            name: true,
            Section: true
          }
        }
      }
    });

    console.log('Found existing marks:', {
      count: existingMarks.length,
      marks: existingMarks.map(m => ({
        studentName: m.student.name,
        section: m.student.Section?.name,
        hasHalfYearly: !!m.halfYearly,
        hasYearly: !!m.yearly
      }))
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
    const createPromises = data.marks
      .filter(mark => {
        if (mark.examType === "HALF_YEARLY") {
          const marksData: any = mark.halfYearly;
          if (!marksData) return false;
          return marksData.ut1 !== null || marksData.ut2 !== null || marksData.noteBook !== null ||
            marksData.subEnrichment !== null || marksData.examMarks !== null ||
            marksData.examMarks40 !== null || marksData.examMarks30 !== null;
        } else {
          const marksData = mark.yearly;
          if (!marksData) return false;
          return marksData.ut3 !== null || marksData.yearlynoteBook !== null || marksData.yearlysubEnrichment !== null ||
            marksData.yearlyexamMarks !== null || marksData.yearlyexamMarks40 !== null || marksData.yearlyexamMarks30 !== null;
        }
      })
      .map(async (mark) => {
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
            student: { connect: { id: mark.studentId } },
            classSubject: { connect: { id: mark.classSubjectId } },
            session: { connect: { id: mark.sessionId } },
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

    const updatePromises = data.marks
      .map(async (mark) => {
        console.log('Processing mark for student:', mark.studentId);

        const examType = mark.examType;
        const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

        // Check if all marks are empty (user cleared them)
        let hasAnyMarks = false;
        if (marksData) {
          if (examType === "HALF_YEARLY") {
            const d = mark.halfYearly;
            if (d) {
              hasAnyMarks = d.ut1 !== null || d.ut2 !== null || d.noteBook !== null ||
                d.subEnrichment !== null || d.examMarks !== null ||
                d.examMarks40 !== null || d.examMarks30 !== null;
            }
          } else {
            const d = mark.yearly;
            if (d) {
              hasAnyMarks = d.ut3 !== null || d.yearlynoteBook !== null || d.yearlysubEnrichment !== null ||
                d.yearlyexamMarks !== null || d.yearlyexamMarks40 !== null || d.yearlyexamMarks30 !== null;
            }
          }
        }

        // If no marks at all, check if a record exists and delete the exam-type sub-record
        if (!hasAnyMarks) {
          const existing = await prisma.juniorMark.findUnique({
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

          if (existing) {
            await prisma.$transaction(async (tx) => {
              // Delete the specific exam type sub-record
              if (examType === "HALF_YEARLY" && existing.halfYearly) {
                await tx.halfYearlyMarks.delete({
                  where: { juniorMarkId: existing.id }
                });
              } else if (examType === "YEARLY" && existing.yearly) {
                await tx.yearlyMarks.delete({
                  where: { juniorMarkId: existing.id }
                });
              }

              // Check if the other exam type still has data
              const otherHasData = examType === "HALF_YEARLY" ? !!existing.yearly : !!existing.halfYearly;
              
              // If neither exam type has data, delete the parent record too
              if (!otherHasData) {
                await tx.juniorMark.delete({
                  where: { id: existing.id }
                });
              }
            });
          }

          console.log('Cleared marks for student:', mark.studentId);
          return null;
        }

        if (!marksData) {
          console.log('No marks data found for student:', mark.studentId);
          return null;
        }

        // Always use upsert to handle both create and update scenarios
        return prisma.juniorMark.upsert({
          where: {
            studentId_classSubjectId_sessionId: {
              studentId: mark.studentId,
              classSubjectId: mark.classSubjectId,
              sessionId: mark.sessionId
            }
          },
          create: {
            student: { connect: { id: mark.studentId } },
            classSubject: { connect: { id: mark.classSubjectId } },
            session: { connect: { id: mark.sessionId } },
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
          },
          include: {
            student: {
              select: {
                name: true
              }
            }
          }
        });
      });

    const results = await Promise.all(updatePromises);
    console.log('Update operation completed. Updated marks for students:',
      results.filter(Boolean).map(r => r?.student?.name).join(', '));

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
