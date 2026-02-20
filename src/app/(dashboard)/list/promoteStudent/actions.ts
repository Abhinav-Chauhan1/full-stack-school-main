"use server";

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export const getStudentsByClassAndSection = async (
  classId: number,
  sectionId: number | null,
  sessionId: number
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        ...(sectionId ? { sectionId } : {}),
        sessionId,
        isAlumni: false // Exclude alumni from promotion list
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
  newClassId: number | null,
  newSectionId: number | null,
  newSessionId: number | null,
  isAlumni: boolean = false,
  alumniYear?: number
) => {
  try {
    if (isAlumni) {
      // Mark students as alumni
      const updates = await prisma.$transaction(
        studentIds.map((id) =>
          prisma.student.update({
            where: { id },
            data: {
              isAlumni: true,
              alumniYear: alumniYear || new Date().getFullYear(),
              classId: null,
              sectionId: null,
              sessionId: null
            }
          })
        )
      );

      revalidatePath('/list/students');
      revalidatePath('/list/promoteStudent');
      revalidatePath('/list/alumni');
      
      return {
        success: true,
        message: `Successfully marked ${updates.length} student${updates.length !== 1 ? 's' : ''} as alumni`
      };
    }

    // Regular promotion logic
    if (!newClassId || !newSessionId) {
      return {
        success: false,
        error: true,
        message: "Class and session are required for promotion"
      };
    }

    // Validate that the new section belongs to the new class
    if (newSectionId) {
      const section = await prisma.section.findUnique({
        where: { id: newSectionId },
        select: { classId: true }
      });
      
      if (!section || section.classId !== newClassId) {
        return {
          success: false,
          error: true,
          message: "The selected section doesn't belong to the selected class"
        };
      }
    }

    // Check class capacity
    const targetClass = await prisma.class.findUnique({
      where: { id: newClassId },
      include: { _count: { select: { students: true } } }
    });

    if (!targetClass) {
      return {
        success: false,
        error: true,
        message: "Target class not found"
      };
    }

    const availableCapacity = targetClass.capacity - targetClass._count.students;
    if (availableCapacity < studentIds.length) {
      return {
        success: false,
        error: true,
        message: `Target class only has ${availableCapacity} available seat${availableCapacity !== 1 ? 's' : ''}, but you're trying to promote ${studentIds.length} student${studentIds.length !== 1 ? 's' : ''}`
      };
    }
    
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

    // Revalidate multiple paths
    revalidatePath('/list/students');
    revalidatePath('/list/promoteStudent');
    revalidatePath('/list/classes');
    revalidatePath('/list/sections');
    
    return {
      success: true,
      message: `Successfully promoted ${updates.length} student${updates.length !== 1 ? 's' : ''}`
    };
  } catch (err) {
    console.error("Promote Students Error:", err);
    
    // Check for specific Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return {
          success: false,
          error: true,
          message: "One or more students not found"
        };
      }
      if (err.code === 'P2002') {
        return {
          success: false,
          error: true,
          message: "A unique constraint violation occurred"
        };
      }
      if (err.code === 'P2003') {
        return {
          success: false,
          error: true,
          message: "Invalid class, section, or session reference"
        };
      }
    }
    
    return {
      success: false,
      error: true,
      message: err instanceof Error ? err.message : "Failed to promote students"
    };
  }
};
