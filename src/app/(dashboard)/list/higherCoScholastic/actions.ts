"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CoScholasticGrade = {
  higherMarkId: number;
  physicalEducation?: string | null;
  workExperience?: string | null;
  discipline?: string | null;
};

export const checkExistingHigherCoScholastic = async (
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

    // First find the higherMark IDs for the given class, section and session
    const higherMarks = await prisma.higherMark.findMany({
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
            physicalEducation: true,
            workExperience: true,
            discipline: true
          }
        }
      },
      distinct: ['studentId'] // One entry per student
    });

    // Map to a more structured format with explicit property mapping
    const mappedData = higherMarks.map(mark => {
      // Ensure we have default values for each field even if coScholastic is null
      const coScholasticData: {
        physicalEducation?: string | null;
        workExperience?: string | null;
        discipline?: string | null;
      } = mark.coScholastic || {};
      
      return {
        higherMarkId: mark.id,
        studentId: mark.studentId,
        studentName: mark.student.name,
        admissionno: mark.student.admissionno,
        physicalEducation: coScholasticData.physicalEducation || "",
        workExperience: coScholasticData.workExperience || "",
        discipline: coScholasticData.discipline || ""
      };
    });

    return { 
      success: true, 
      error: false,
      data: mappedData
    };
  } catch (err) {
    console.error("Check Existing Higher Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred",
      data: []
    };
  }
};

export const saveHigherCoScholastic = async (
  data: { 
    marks: CoScholasticGrade[];
  }
) => {
  try {
    const { marks } = data;
    
    // Filter out marks that don't have any grades set
    const marksWithGrades = marks.filter(mark => {
      return mark.physicalEducation || mark.workExperience || mark.discipline;
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
      // Check if the higherMark exists before proceeding
      const higherMark = await prisma.higherMark.findUnique({
        where: { id: mark.higherMarkId },
        include: { coScholastic: true }
      });

      if (!higherMark) {
        console.error(`Higher mark with ID ${mark.higherMarkId} not found`);
        return null;
      }

      // Prepare update data
      const updateData = {
        physicalEducation: mark.physicalEducation || null,
        workExperience: mark.workExperience || null,
        discipline: mark.discipline || null
      };

      // Use upsert to handle both create and update cases
      return prisma.higherCoScholastic.upsert({
        where: {
          higherMarkId: mark.higherMarkId
        },
        create: {
          higherMarkId: mark.higherMarkId,
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
    console.error("Save Higher Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteHigherCoScholastic = async (
  data: { 
    higherMarkId: number
  }
) => {
  try {
    if (!data.higherMarkId) {
      return { 
        success: false, 
        error: true,
        message: "Missing higher mark ID"
      };
    }

    await prisma.higherCoScholastic.delete({
      where: { 
        higherMarkId: data.higherMarkId
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Co-scholastic record deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Higher Co-Scholastic Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const getHigherCoScholasticData = async (
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
        // Find students with at least one higher mark
        markHigher: {
          some: {
            sessionId: data.sessionId
          }
        }
      },
      select: {
        id: true,
        name: true,
        admissionno: true,
        markHigher: {
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
      .filter(student => student.markHigher.length > 0)
      .map(student => ({
        id: student.id,
        name: student.name,
        admissionno: student.admissionno,
        higherMarkId: student.markHigher[0].id
      }));

    return {
      success: true,
      students: mappedStudents
    };
  } catch (err) {
    console.error("Get Higher Co-Scholastic Data Error:", err);
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

    // Fetch higher classes (11-12)
    const classes = await prisma.class.findMany({
      where: {
        classNumber: {
          gte: 11 // Higher classes 11-12
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
