"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CoScholasticGrade = {
  seniorMarkId: number;
  term1ValueEducation?: string | null;
  term1PhysicalEducation?: string | null;
  term1ArtCraft?: string | null;
  term1Discipline?: string | null;
  term2ValueEducation?: string | null;
  term2PhysicalEducation?: string | null;
  term2ArtCraft?: string | null;
  term2Discipline?: string | null;
};

export const checkExistingSeniorCoScholastic = async (
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

    // First find the seniorMark IDs for the given class, section and session
    const seniorMarks = await prisma.seniorMark.findMany({
      where: {
        sectionSubject: {
          section: {
            classId: data.classId
          },
          sectionId: data.sectionId
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
        coScholastic: {
          select: {
            term1ValueEducation: true,
            term1PhysicalEducation: true,
            term1ArtCraft: true, 
            term1Discipline: true,
            term2ValueEducation: true,
            term2PhysicalEducation: true,
            term2ArtCraft: true,
            term2Discipline: true
          }
        }
      },
      distinct: ['studentId'] // One entry per student
    });

    // Map to a more structured format with explicit property mapping
    const mappedData = seniorMarks.map(mark => {
      // Ensure we have default values for each field even if coScholastic is null
      const coScholasticData: {
        term1ValueEducation?: string | null;
        term1PhysicalEducation?: string | null;
        term1ArtCraft?: string | null;
        term1Discipline?: string | null;
        term2ValueEducation?: string | null;
        term2PhysicalEducation?: string | null;
        term2ArtCraft?: string | null;
        term2Discipline?: string | null;
      } = mark.coScholastic || {};
      
      return {
        seniorMarkId: mark.id,
        studentId: mark.studentId,
        studentName: mark.student.name,
        admissionno: mark.student.admissionno,
        term1ValueEducation: coScholasticData.term1ValueEducation || "",
        term1PhysicalEducation: coScholasticData.term1PhysicalEducation || "",
        term1ArtCraft: coScholasticData.term1ArtCraft || "",
        term1Discipline: coScholasticData.term1Discipline || "",
        term2ValueEducation: coScholasticData.term2ValueEducation || "",
        term2PhysicalEducation: coScholasticData.term2PhysicalEducation || "",
        term2ArtCraft: coScholasticData.term2ArtCraft || "",
        term2Discipline: coScholasticData.term2Discipline || ""
      };
    });

    return { 
      success: true, 
      error: false,
      data: mappedData
    };
  } catch (err) {
    console.error("Check Existing Senior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred",
      data: []
    };
  }
};

export const saveSeniorCoScholastic = async (
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
      // Check if the seniorMark exists before proceeding
      const seniorMark = await prisma.seniorMark.findUnique({
        where: { id: mark.seniorMarkId },
        include: { coScholastic: true }
      });

      if (!seniorMark) {
        console.error(`Senior mark with ID ${mark.seniorMarkId} not found`);
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
      return prisma.seniorCoScholastic.upsert({
        where: {
          seniorMarkId: mark.seniorMarkId
        },
        create: {
          seniorMarkId: mark.seniorMarkId,
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
    console.error("Save Senior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteSeniorCoScholastic = async (
  data: { 
    seniorMarkId: number
  }
) => {
  try {
    if (!data.seniorMarkId) {
      return { 
        success: false, 
        error: true,
        message: "Missing senior mark ID"
      };
    }

    await prisma.seniorCoScholastic.delete({
      where: { 
        seniorMarkId: data.seniorMarkId
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Co-scholastic record deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Senior Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const getSeniorCoScholasticData = async (
  data: {
    classId: number;
    sectionId: number;
    sessionId: number;
  }
) => {
  try {
    // Find students in the specified class and section with senior marks
    const students = await prisma.student.findMany({
      where: {
        classId: data.classId,
        sectionId: data.sectionId,
        // Find students with at least one senior mark
        marksSenior: {
          some: {
            sessionId: data.sessionId
          }
        }
      },
      select: {
        id: true,
        name: true,
        admissionno: true,
        marksSenior: {
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
      .filter(student => student.marksSenior.length > 0)
      .map(student => ({
        id: student.id,
        name: student.name,
        admissionno: student.admissionno,
        seniorMarkId: student.marksSenior[0].id
      }));

    return {
      success: true,
      students: mappedStudents
    };
  } catch (err) {
    console.error("Get Senior Co-Scholastic Data Error:", err);
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

    // Fetch senior classes (9-10)
    const classes = await prisma.class.findMany({
      where: {
        classNumber: {
          gte: 9,
          lte: 10 // Senior classes 9-10
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
