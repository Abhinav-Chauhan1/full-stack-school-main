"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStudentsByClassAndSection = async (
  classId: number,
  sectionId: number | null,
  sessionId: number
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
        sessionId
      },
      include: {
        Class: true,
        Section: true
      }
    });

    return { success: true, data: students };
  } catch (err) {
    console.error("Get Students Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Failed to fetch students" 
    };
  }
};

export const promoteStudents = async (
  studentIds: string[],
  newClassId: number,
  newSectionId: number | null,
  newSessionId: number
) => {
  try {
    const updates = await prisma.$transaction(
      studentIds.map((id) =>
        prisma.student.update({
          where: { id },
          data: {
            classId: newClassId,
            sectionId: newSectionId,
            sessionId: newSessionId
          }
        })
      )
    );

    return {
      success: true,
      message: `Successfully promoted ${updates.length} students`
    };
  } catch (err) {
    console.error("Promote Students Error:", err);
    return {
      success: false,
      error: true,
      message: err instanceof Error ? err.message : "Failed to promote students"
    };
  }
};
