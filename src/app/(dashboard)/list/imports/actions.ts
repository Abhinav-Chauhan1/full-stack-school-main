'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function importStudents(students: any[]) {
  try {
    await prisma.student.createMany({
      data: students,
      skipDuplicates: true,
    });
    
    revalidatePath('/list/students');
    return { success: true };
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error importing students' 
    };
  }
}
