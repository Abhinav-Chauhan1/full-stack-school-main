'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { convertStudentData } from './utils';
import { type Prisma } from '@prisma/client';

export async function importStudentsWithMarks({ 
  students, 
  classId, 
  sectionId, 
  includeMarks 
}: { 
  students: any[], 
  classId: number, 
  sectionId: number, 
  includeMarks: boolean 
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const createdStudents = await Promise.all(students.map(async (student) => {
        const convertedStudent = convertStudentData(student);
        
        // Create student with both data and relations
        const studentCreateInput: Prisma.StudentCreateInput = {
          ...convertedStudent,
          Class: {
            connect: { id: classId }
          },
          Section: {
            connect: { id: sectionId }
          }
        };

        const createdStudent = await tx.student.create({
          data: studentCreateInput
        });

        if (includeMarks && student.marks) {
          await tx.higherMark.createMany({
            data: student.marks.map((mark: any) => ({
              ...mark,
              studentId: createdStudent.id,
              sectionSubjectId: mark.subjectId,
              sessionId: mark.sessionId,
            })),
          });
        }

        return createdStudent;
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

export async function exportStudentsWithMarks(classId: number, sectionId: number, includeMarks: boolean) {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
      },
      include: includeMarks ? {
        markHigher: {
          include: {
            sectionSubject: {
              include: {
                subject: true
              }
            }
          }
        },
        marksSenior: true,
        marksJunior: true,
      } : undefined,
    });

    return { success: true, data: students };
  } catch (error) {
    console.error('Export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error exporting students' 
    };
  }
}
