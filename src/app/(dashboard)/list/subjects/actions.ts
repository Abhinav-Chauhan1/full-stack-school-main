"use server";

import { PrismaClient } from '@prisma/client';
import { SubjectSchema } from "@/lib/formValidationSchemas";

const prisma = new PrismaClient();

type CurrentState = { success: boolean; error: boolean };

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    // Find the last subject to get the highest ID
    const lastSubject = await prisma.subject.findFirst({
      orderBy: {
        id: 'desc'
      }
    });

    // Calculate next ID (start with 1 if no subjects exist)
    const nextId = lastSubject ? lastSubject.id + 1 : 1;

    // Check if subject with same code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { code: data.code }
    });

    if (existingSubject) {
      return { 
        success: false, 
        error: true, 
      };
    }

    await prisma.subject.create({
      data: {
        id: nextId,
        name: data.name,
        code: data.code,
        description: data.description || "",
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Create subject error:", err);
    return { 
      success: false, 
      error: true, 
    };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    // Check if another subject with same code exists
    const existingSubject = await prisma.subject.findFirst({
      where: {
        code: data.code,
        NOT: { id: data.id }
      }
    });

    if (existingSubject) {
      return { 
        success: false, 
        error: true, 
      };
    }

    if (!data.id) {
      return { 
        success: false, 
        error: true, 
      };
    }

    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description || "",
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update subject error:", err);
    return { 
      success: false, 
      error: true, 
    };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { success: false, error: true};
  }
};
