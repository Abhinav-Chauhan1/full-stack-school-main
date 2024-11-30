// src/lib/actions/getStudents.ts
'use server';
import prisma from "@/lib/prisma";

export async function getStudents(classId: number, sectionId: number, subjectId: number) {
  try {
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
      },
      select: {
        id: true,
        name: true,
        admissionno: true,
        classId: true,
        sectionId: true,
      },
      orderBy: {
        admissionno: 'asc',
      },
    });
    
    return students;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to fetch students');
  }
}

export async function getMarks(query: any, page: number = 1, itemsPerPage: number = 10) {
  try {
    // Transaction to fetch marks data and count simultaneously
    const [marksData, totalCount] = await prisma.$transaction([
      prisma.juniorMark.findMany({
        where: query,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionno: true,
            },
          },
          classSubject: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          session: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { student: { name: 'asc' } },
          { classSubject: { subject: { name: 'asc' } } }
        ],
        take: itemsPerPage,
        skip: itemsPerPage * (page - 1),
      }),
      prisma.juniorMark.count({
        where: query,
      }),
    ]);

    return {
      data: marksData,
      total: totalCount,
      totalPages: Math.ceil(totalCount / itemsPerPage),
      currentPage: page,
    };
  } catch (error) {
    console.error('Error fetching marks:', error);
    throw new Error('Failed to fetch marks data');
  }
}