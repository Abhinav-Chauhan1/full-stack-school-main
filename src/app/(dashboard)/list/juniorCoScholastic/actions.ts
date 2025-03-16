"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CoScholasticGrade = {
  juniorMarkId: string;
  term1ValueEducation?: string | null;
  term1PhysicalEducation?: string | null;
  term1ArtCraft?: string | null;
  term1Discipline?: string | null;
  term2ValueEducation?: string | null;
  term2PhysicalEducation?: string | null;
  term2ArtCraft?: string | null;
  term2Discipline?: string | null;
};

export const checkExistingJuniorCoScholastic = async (
  data: { 
    classId: number;
    sectionId: number;
    sessionId: number;
  }
) => {
  try {
    if (!data.classId || !data.sectionId || !data.sessionId) {
      return { 
        success: false, 
        error: true,
        message: "Missing required fields",
        data: []
      };
    }

    // First find the juniorMark IDs for the given class, section and session
    const juniorMarks = await prisma.juniorMark.findMany({
      where: {
        classSubject: {
          classId: data.classId
        },
        student: {
          sectionId: data.sectionId
        },
        sessionId: data.sessionId
      },
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            name: true,
            admissionno: true
          }
        },
        coScholastic: true
      },
      distinct: ['studentId'] // One entry per student
    });

    // Map to a more structured format
    const mappedData = juniorMarks.map(mark => ({
      juniorMarkId: mark.id,
      studentId: mark.studentId,
      studentName: mark.student.name,
      admissionno: mark.student.admissionno,
      ...mark.coScholastic
    }));

    return { 
      success: true, 
      error: false,
      data: mappedData
    };
  } catch (err) {
    console.error("Check Existing Junior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred",
      data: []
    };
  }
};

export const saveJuniorCoScholastic = async (
  data: { 
    marks: CoScholasticGrade[];
    term: "TERM1" | "TERM2";
  }
) => {
  try {
    const { marks, term } = data;
    
    // Filter out marks that don't have any grades set
    const marksWithGrades = marks.filter(mark => {
      if (term === "TERM1") {
        return mark.term1ValueEducation || 
               mark.term1PhysicalEducation || 
               mark.term1ArtCraft || 
               mark.term1Discipline;
      } else {
        return mark.term2ValueEducation || 
               mark.term2PhysicalEducation || 
               mark.term2ArtCraft || 
               mark.term2Discipline;
      }
    });

    if (marksWithGrades.length === 0) {
      return {
        success: false,
        error: true,
        message: "No grades provided for any student"
      };
    }

    // Process each mark entry
    const updatePromises = marksWithGrades.map(async (mark) => {
      // Check if the juniorMark exists before proceeding
      const juniorMark = await prisma.juniorMark.findUnique({
        where: { id: mark.juniorMarkId },
        include: { coScholastic: true }
      });

      if (!juniorMark) {
        console.error(`Junior mark with ID ${mark.juniorMarkId} not found`);
        return null;
      }

      // Prepare update data based on selected term
      const updateData = term === "TERM1" 
        ? {
            term1ValueEducation: mark.term1ValueEducation || null,
            term1PhysicalEducation: mark.term1PhysicalEducation || null,
            term1ArtCraft: mark.term1ArtCraft || null,
            term1Discipline: mark.term1Discipline || null
          }
        : {
            term2ValueEducation: mark.term2ValueEducation || null,
            term2PhysicalEducation: mark.term2PhysicalEducation || null,
            term2ArtCraft: mark.term2ArtCraft || null,
            term2Discipline: mark.term2Discipline || null
          };

      // Use upsert to handle both create and update cases
      return prisma.juniorCoScholastic.upsert({
        where: {
          juniorMarkId: mark.juniorMarkId
        },
        create: {
          juniorMarkId: mark.juniorMarkId,
          ...updateData
        },
        update: updateData
      });
    });

    // Execute all database operations
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(Boolean).length;

    return { 
      success: true, 
      error: false,
      message: `Successfully saved ${successCount} student co-scholastic grades`
    };
  } catch (err) {
    console.error("Save Junior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteJuniorCoScholastic = async (
  data: { 
    juniorMarkId: string
  }
) => {
  try {
    if (!data.juniorMarkId) {
      return { 
        success: false, 
        error: true,
        message: "Missing junior mark ID"
      };
    }

    await prisma.juniorCoScholastic.delete({
      where: { 
        juniorMarkId: data.juniorMarkId
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Co-scholastic record deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Junior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const getJuniorCoScholasticData = async (
  data: {
    classId: number;
    sectionId: number;
    sessionId: number;
  }
) => {
  try {
    // Find students in the specified class and section
    const students = await prisma.student.findMany({
      where: {
        classId: data.classId,
        sectionId: data.sectionId,
        // Find students with at least one junior mark
        marksJunior: {
          some: {
            sessionId: data.sessionId
          }
        }
      },
      select: {
        id: true,
        name: true,
        admissionno: true,
        marksJunior: {
          where: { 
            sessionId: data.sessionId 
          },
          take: 1, // We just need one to get the ID
          select: { 
            id: true 
          }
        }
      }
    });

    // Map to required format
    const mappedStudents = students
      .filter(student => student.marksJunior.length > 0)
      .map(student => ({
        id: student.id,
        name: student.name,
        admissionno: student.admissionno,
        juniorMarkId: student.marksJunior[0].id
      }));

    return {
      success: true,
      students: mappedStudents
    };
  } catch (err) {
    console.error("Get Junior Co-Scholastic Data Error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const getInitialData = async () => {
  try {
    // Fetch sessions
    const sessions = await prisma.session.findMany({
      orderBy: { sessionfrom: "desc" },
      select: {
        id: true,
        sessioncode: true,
        isActive: true
      }
    });

    // Fetch junior classes
    const classes = await prisma.class.findMany({
      where: {
        classNumber: {
          lte: 8 // Junior classes only
        }
      },
      orderBy: { 
        classNumber: "asc" 
      },
      select: {
        id: true,
        name: true,
        sections: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return {
      success: true,
      sessions,
      classes
    };
  } catch (err) {
    console.error("Get Initial Data Error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
