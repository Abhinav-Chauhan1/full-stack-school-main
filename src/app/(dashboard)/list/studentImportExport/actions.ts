'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { convertStudentData } from './utils';
import { type Prisma } from '@prisma/client';

export async function importStudentsWithMarks({ 
  students, 
  classId, 
  sectionId,
  sessionId
}: { 
  students: any[], 
  classId: number, 
  sectionId: number,
  sessionId: number
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const createdStudents = await Promise.all(students.map(async (student) => {
        const convertedStudent = convertStudentData(student);
        
        const studentCreateInput: Prisma.StudentCreateInput = {
          ...convertedStudent,
          Class: {
            connect: { id: classId }
          },
          Section: {
            connect: { id: sectionId }
          },
          Session: {
            connect: { id: sessionId }
          }
        };

        return await tx.student.create({
          data: studentCreateInput
        });
      }));

      revalidatePath('/list/students');
      return { success: true, data: createdStudents };
    });
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error importing students' 
    };
  }
}

export async function exportStudentsWithMarks(
  classId: number, 
  sectionId: number, 
  sessionId: number
) {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
        sessionId,
      },
      select: {
        admissiondate: true,
        admissionno: true,
        name: true,
        address: true,
        city: true,
        village: true,
        Sex: true,
        birthday: true,
        nationality: true,
        Religion: true,
        tongue: true,
        category: true,
        mothername: true,
        mphone: true,
        moccupation: true,
        fathername: true,
        fphone: true,
        foccupation: true,
        aadharcard: true,
        house: true,
        bloodgroup: true,
        previousClass: true,
        yearofpass: true,
        board: true,
        school: true,
        grade: true
      },
    });

    // Transform dates to YYYY-MM-DD format for Excel
    const formattedStudents = students.map(student => ({
      ...student,
      admissiondate: student.admissiondate.toISOString().split('T')[0],
      birthday: student.birthday.toISOString().split('T')[0],
    }));

    return { success: true, data: formattedStudents };
  } catch (error) {
    console.error('Export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error exporting students' 
    };
  }
}
