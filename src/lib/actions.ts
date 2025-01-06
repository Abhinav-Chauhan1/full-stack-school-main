"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  JuniorMarkSchema,
  HigherMarkSchema, 
  SubCategorySchema,
  SessionSchema,
  SectionSchema,
  SeniorMarkSchema,
} from "./formValidationSchemas";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { Category } from "@prisma/client";
import { PrismaClient } from '@prisma/client';
import { calculateMarksAndGrade , calculateSeniorMarksAndGrade} from './formValidationSchemas';

const prisma = new PrismaClient();

type CurrentState = { success: boolean; error: boolean };

export const checkExistingJuniorMarks = async (
  data: { 
    classSubjectId: number, 
    sessionId: number, 
    examType: "HALF_YEARLY" | "YEARLY" 
  }
) => {
  try {
    if (!data.classSubjectId || !data.sessionId || !data.examType) {
      return { 
        success: false, 
        error: true,
        message: "Missing required fields"
      };
    }

    // First verify that the ClassSubject exists
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: data.classSubjectId }
    });

    if (!classSubject) {
      return {
        success: false,
        error: true,
        message: "Could not find matching Class Subject"
      };
    }

    // Then query the marks
    const existingMarks = await prisma.juniorMark.findMany({
      where: {
        classSubjectId: data.classSubjectId,
        sessionId: data.sessionId,
        [data.examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
          isNot: null
        }
      },
      include: {
        halfYearly: data.examType === "HALF_YEARLY",
        yearly: data.examType === "YEARLY"
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createJuniorMarks = async (data: { marks: JuniorMarkSchema[] }) => {
  try {
    const createPromises = data.marks.map(async (mark) => {
      const examType = mark.examType;
      const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

      if (!marksData) return null;

      return prisma.juniorMark.create({
        data: {
          student: { connect: { id: mark.studentId }},
          classSubject: { connect: { id: mark.classSubjectId }},
          session: { connect: { id: mark.sessionId }},
          [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
            create: marksData
          },
          grandTotalMarks: mark.grandTotalMarks || 0,
          grandTotalGrade: mark.grandTotalGrade || '',
          overallPercentage: mark.overallPercentage || 0
        }
      });
    });

    await Promise.all(createPromises);
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateJuniorMarks = async (data: { marks: JuniorMarkSchema[] }) => {
  try {
    const updatePromises = data.marks.map(async (mark) => {
      const examType = mark.examType;
      const marksData = examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly;

      if (!marksData) return null;

      // First check if there's an existing record
      const existingMark = await prisma.juniorMark.findUnique({
        where: {
          studentId_classSubjectId_sessionId: {
            studentId: mark.studentId,
            classSubjectId: mark.classSubjectId,
            sessionId: mark.sessionId
          }
        },
        include: {
          halfYearly: true,
          yearly: true
        }
      });

      if (!existingMark) {
        // If no record exists, create a new one
        return prisma.juniorMark.create({
          data: {
            student: { connect: { id: mark.studentId }},
            classSubject: { connect: { id: mark.classSubjectId }},
            session: { connect: { id: mark.sessionId }},
            [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
              create: marksData
            },
            grandTotalMarks: mark.grandTotalMarks || 0,
            grandTotalGrade: mark.grandTotalGrade || '',
            overallPercentage: mark.overallPercentage || 0
          }
        });
      }

      // Update existing record
      return prisma.juniorMark.update({
        where: {
          id: existingMark.id
        },
        data: {
          [examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: {
            upsert: {
              create: marksData,
              update: marksData
            }
          },
          grandTotalMarks: mark.grandTotalMarks || 0,
          grandTotalGrade: mark.grandTotalGrade || '',
          overallPercentage: mark.overallPercentage || 0
        }
      });
    });

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteJuniorMark = async (
  data: { 
    studentId: string, 
    classSubjectId: number, 
    sessionId: number, 
    examType: "HALF_YEARLY" | "YEARLY" 
  }
) => {
  try {
    // Validate input data
    if (!data.studentId || !data.classSubjectId || !data.sessionId || !data.examType) {
      return { 
        success: false, 
        error: true,
        message: "Missing required fields" 
      };
    }

    // Find the junior mark record with proper constraints
    const juniorMark = await prisma.juniorMark.findUnique({
      where: {
        studentId_classSubjectId_sessionId: {
          studentId: data.studentId,
          classSubjectId: data.classSubjectId,
          sessionId: data.sessionId
        }
      },
      include: {
        halfYearly: true,
        yearly: true
      }
    });

    if (!juniorMark) {
      return { 
        success: false, 
        error: true,
        message: "Mark record not found" 
      };
    }

    // Start transaction for deleting marks
    await prisma.$transaction(async (prisma) => {
      // Delete the specific exam type marks
      if (data.examType === "HALF_YEARLY" && juniorMark.halfYearly) {
        await prisma.halfYearlyMarks.delete({
          where: { juniorMarkId: juniorMark.id }
        });
      } else if (data.examType === "YEARLY" && juniorMark.yearly) {
        await prisma.yearlyMarks.delete({
          where: { juniorMarkId: juniorMark.id }
        });
      }

      // If both types of marks are deleted, delete the parent record
      const shouldDeleteParent = data.examType === "HALF_YEARLY" ? 
        !juniorMark.yearly : !juniorMark.halfYearly;

      if (shouldDeleteParent) {
        await prisma.juniorMark.delete({
          where: { id: juniorMark.id }
        });
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Marks deleted successfully" 
    };

  } catch (err) {
    console.error("Delete Junior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

//subCategory
export const createSubCategory = async (
  currentState: CurrentState,
  data: SubCategorySchema
) => {
  try {
    await prisma.subCategory.create({
      data: {
        name: data.name,
        category: data.category as Category, // Convert to Category enum
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { success: false, error: true};
  }
};

export const updateSubCategory = async (
  currentState: CurrentState,
  data: SubCategorySchema
) => {
  try {
    await prisma.subCategory.update({
      where: { id: data.id },
      data: {
        name: data.name,
        category: data.category as Category, // Convert to Category enum
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { success: false, error: true};
  }
};

export const deleteSubCategory = async (
  currentState: CurrentState,
  formData: FormData
) => {
  try {
    const id = formData.get("id");


    await prisma.subCategory.delete({
      where: {
        id: id ? parseInt(id.toString(), 10) : undefined,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};


// Section
export const createSection = async (
  currentState: { success: boolean; error: boolean },
  formData: SectionSchema
) => {
  try {
    await prisma.section.create({
      data: {
        name: formData.name,
        classId: formData.classId,
        sectionSubjects: {
          create: formData.subjects?.map((subjectId) => ({
            subject: { connect: { id: subjectId } }
          }))
        }
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error creating section:", err);
    return { success: false, error: true };
  }
};

export const updateSection = async (
  currentState: { success: boolean; error: boolean },
  formData: SectionSchema
) => {
  try {
    if (!formData.id) {
      return { success: false, error: true };
    }

    await prisma.$transaction(async (tx) => {
      // First delete any associated senior marks
      await tx.seniorMark.deleteMany({
        where: {
          sectionSubject: {
            sectionId: formData.id
          }
        }
      });

      // Then delete existing section-subject relationships
      await tx.sectionSubject.deleteMany({
        where: { sectionId: formData.id }
      });

      // Update section and create new relationships
      await tx.section.update({
        where: { id: formData.id },
        data: {
          name: formData.name,
          classId: formData.classId,
          sectionSubjects: {
            create: formData.subjects?.map((subjectId) => ({
              subject: { connect: { id: subjectId } }
            }))
          }
        },
      });
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error updating section:", err);
    return { success: false, error: true };
  }
};

export const deleteSection = async (
  currentState: { success: boolean; error: boolean },
  formData: FormData
) => {
  try {
    const id = formData.get("id");
    
    const sectionId = id ? parseInt(id as string, 10) : null;
    if (!sectionId || isNaN(sectionId)) {
      return { success: false, error: true};
    }

    // Delete associated sectionSubjects first
    await prisma.sectionSubject.deleteMany({
      where: { sectionId },
    });

    // Then delete the section
    await prisma.section.delete({
      where: { id: sectionId },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error("Error deleting section:", err);
    return { success: false, error: true};
  }
};


// Create Session
export const createSession = async (
  currentState: { success: boolean; error: boolean },
  formData: SessionSchema
) => {
  try {
    // Validate required fields
    if (!formData.sessionfrom || !formData.sessionto || !formData.sessioncode) {
      return { 
        success: false, 
        error: true, 
      };
    }

    // Check if session code already exists
    const existingSession = await prisma.session.findUnique({
      where: { sessioncode: formData.sessioncode }
    });

    if (existingSession) {
      return {
        success: false,
        error: true,
      };
    }

    // Validate date range
    if (new Date(formData.sessionfrom) >= new Date(formData.sessionto)) {
      return {
        success: false,
        error: true,
 
      };
    }

    // Check if there's already an active session when trying to create a new active one
    if (formData.isActive) {
      const activeSession = await prisma.session.findFirst({
        where: { isActive: true }
      });

      if (activeSession) {
        return {
          success: false,
          error: true,
  
        };
      }
    }

    // Create session
    await prisma.session.create({
      data: {
        sessionfrom: new Date(formData.sessionfrom),
        sessionto: new Date(formData.sessionto),
        sessioncode: formData.sessioncode,
        description: formData.description || null,
        isActive: formData.isActive || false
      },
    });

    return { 
      success: true, 
      error: false, 
   
    };
  } catch (err: any) {
    console.error("Error creating session:", err);
    return {
      success: false,
      error: true
    };
  }
};

// Update Session
export const updateSession = async (
  currentState: { success: boolean; error: boolean },
  formData: SessionSchema & { id: number }
) => {
  try {
    if (!formData.id) {
      return { 
        success: false, 
        error: true, 
  
      };
    }

    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id: formData.id }
    });

    if (!existingSession) {
      return {
        success: false,
        error: true,
       
      };
    }

    // Check for duplicate session code
    const duplicateCode = await prisma.session.findFirst({
      where: {
        sessioncode: formData.sessioncode,
        id: { not: formData.id }
      }
    });

    if (duplicateCode) {
      return {
        success: false,
        error: true,
        
      };
    }

    // Validate date range
    if (new Date(formData.sessionfrom) >= new Date(formData.sessionto)) {
      return {
        success: false,
        error: true,
       
      };
    }

    // Check active session conflict
    if (formData.isActive) {
      const activeSession = await prisma.session.findFirst({
        where: { 
          isActive: true,
          id: { not: formData.id }
        }
      });

      if (activeSession) {
        return {
          success: false,
          error: true,
         
        };
      }
    }

    // Update session
    await prisma.session.update({
      where: { id: formData.id },
      data: {
        sessionfrom: new Date(formData.sessionfrom),
        sessionto: new Date(formData.sessionto),
        sessioncode: formData.sessioncode,
        description: formData.description || null,
        isActive: formData.isActive || false
      },
    });


    return { 
      success: true, 
      error: false, 
      
    };
  } catch (err: any) {
    console.error("Error updating session:", err);
    return {
      success: false,
      error: true
    };
  }
};

// Delete Session
export const deleteSession = async (
  currentState: { success: boolean; error: boolean },
  formData: FormData
) => {
  try {
    const id = formData.get("id");
    const sessionId = id ? parseInt(id as string, 10) : null;

    if (!sessionId || isNaN(sessionId)) {
      return { 
        success: false, 
        error: true, 
       
      };
    }

    // Check if session exists and is not active
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return {
        success: false,
        error: true,
        
      };
    }

    if (session.isActive) {
      return {
        success: false,
        error: true,
       
      };
    }

    // Check for related records (if any)
    const hasRelatedRecords = await prisma.student.count({
      where: { sessionId }
    });

    if (hasRelatedRecords > 0) {
      return {
        success: false,
        error: true,
       
      };
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionId }
    });

    return { 
      success: true, 
      error: false
    };
  } catch (err: any) {
    console.error("Error deleting session:", err);
    return {
      success: false,
      error: true
    };
  }
};



//Subjects

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
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

//Classes

export const createClass = async (
  currentState: { success: boolean; error: boolean },
  data: ClassSchema
) => {
  try {
    await prisma.class.create({
      data: {
        name: data.name,
        classNumber: Number(data.classNumber),
        capacity: Number(data.capacity),
        classSubjects: {
          create: data.subjects.map((subjectId: number) => ({
            subject: {
              connect: { id: subjectId }
            }
          }))
        }
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Create class error:", err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: { success: boolean; error: boolean },
  data: ClassSchema
) => {
  try {
    await prisma.$transaction(async (tx) => {
      // First get all ClassSubject IDs for this class
      const existingClassSubjects = await tx.classSubject.findMany({
        where: { classId: Number(data.id) },
        select: { id: true }
      });

      // Delete all related JuniorMark records first
      await tx.juniorMark.deleteMany({
        where: {
          classSubjectId: {
            in: existingClassSubjects.map(cs => cs.id)
          }
        }
      });

      // Now delete existing ClassSubject records
      await tx.classSubject.deleteMany({
        where: { classId: Number(data.id) }
      });

      // Update the class with new relationships
      await tx.class.update({
        where: { id: Number(data.id) },
        data: {
          name: data.name,
          classNumber: Number(data.classNumber),
          capacity: Number(data.capacity),
          classSubjects: {
            create: data.subjects?.map((subjectId: number) => ({
              subject: {
                connect: { id: subjectId }
              }
            }))
          }
        },
      });
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update class error:", err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: { success: boolean; error: boolean },
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // First, find all ClassSubject IDs for this class
      const classSubjects = await tx.classSubject.findMany({
        where: { classId: Number(id) },
        select: { id: true }
      });

      // Delete all JuniorMark records associated with these ClassSubjects
      await tx.juniorMark.deleteMany({
        where: {
          classSubjectId: {
            in: classSubjects.map(cs => cs.id)
          }
        }
      });

      // Now delete the ClassSubject records
      await tx.classSubject.deleteMany({
        where: { classId: Number(id) }
      });

      // Finally, delete the class
      await tx.class.delete({
        where: { id: Number(id) },
      });
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


// Create Teacher Function
// Modified createTeacher function with proper Clerk integration
export const createTeacher = async (
  currentState: { success: boolean; error: boolean },
  formData: TeacherSchema
) => {
  try {
    // Create user in Clerk with required fields
    const user = await clerkClient().users.createUser({
      password: formData.password || Math.random().toString(36).slice(-8),
      firstName: formData.name,
      lastName: "",
      username: formData.name,
      publicMetadata: { 
        role: "teacher",
      },
    });

    // Create teacher in Prisma
    await prisma.teacher.create({
      data: {
        id: user.id,
        name: formData.name,
        Sex: formData.Sex,
        FatherHusband: formData.FatherHusband,
        birthday: new Date(formData.birthday),
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        bloodgroup: formData.bloodgroup,
        joiningdate: new Date(formData.joiningdate),
        designation: formData.designation,
        qualification: formData.qualification,
        EmployeeType: formData.EmployeeType,
        img: formData.img,
        password: formData.password || "", // Store password in Prisma
        createdAt: new Date(),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error creating teacher:", err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: { success: boolean; error: boolean },
  formData: TeacherSchema
) => {
  try {
    if (!formData.id) {
      return { success: false, error: true};
    }

    // Only update Clerk user if necessary fields changed
    const clerkUpdateData: any = {
      firstName: formData.name,
      lastName: "",
    };

    // Only include password if it's provided
    if (formData.password) {
      clerkUpdateData.password = formData.password;
    }

    // Only update username if name changed
    if (formData.name) {
      clerkUpdateData.username = formData.name;
    }

    // Update Clerk user
    await clerkClient().users.updateUser(formData.id, clerkUpdateData);

    // Prepare Prisma update data
    const prismaUpdateData: any = {
      name: formData.name,
      Sex: formData.Sex,
      FatherHusband: formData.FatherHusband,
      birthday: new Date(formData.birthday),
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      bloodgroup: formData.bloodgroup,
      joiningdate: new Date(formData.joiningdate),
      designation: formData.designation,
      qualification: formData.qualification,
      EmployeeType: formData.EmployeeType,
    };

    // Only include optional fields if they're provided
    if (formData.img) {
      prismaUpdateData.img = formData.img;
    }
    
    if (formData.password) {
      prismaUpdateData.password = formData.password;
    }

    // Update teacher in Prisma
    await prisma.teacher.update({
      where: { id: formData.id },
      data: prismaUpdateData,
    });
      
    return { 
      success: true, 
      error: false,
    };

  } catch (err: any) {
    console.error("Error updating teacher:", err);
    return { 
      success: false, 
      error: true, 
    };
  }
};



export const deleteTeacher = async (
  currentState: { success: boolean; error: boolean },
  formData: FormData
) => {
  try {
    // Extract ID from FormData
    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      console.error("Error: Missing or invalid teacher ID");
      return { success: false, error: true};
    }

    // Delete user in Clerk
    console.log(`Attempting to delete Clerk user with ID: ${id}`);
    await clerkClient().users.deleteUser(id);
    console.log(`Clerk user with ID ${id} deleted successfully`);

    // Delete teacher in Prisma
    console.log(`Attempting to delete Prisma teacher with ID: ${id}`);
    await prisma.teacher.delete({
      where: { id: id },
    });
    console.log(`Prisma teacher with ID ${id} deleted successfully`);

    return { success: true, error: false, message: "Teacher deleted successfully" };
  } catch (err: any) {
    console.error("Error deleting teacher:", err);
    return { success: false, error: true };
  }
};





export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    // Check class capacity
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    // Create student record
    await prisma.student.create({
      data: {
        admissiondate: new Date(data.admissiondate),
        admissionno: data.admissionno,
        name: data.name,
        address: data.address,
        city: data.city,
        village: data.village,
        Sex: data.Sex,
        birthday: new Date(data.birthday),
        nationality: data.nationality,
        Religion: data.Religion,
        tongue: data.tongue,
        category: data.category,
        mothername: data.mothername,
        mphone: data.mphone,
        moccupation: data.moccupation,
        fathername: data.fathername,
        fphone: data.fphone,
        foccupation: data.foccupation,
        aadharcard: data.aadharcard,
        house: data.house,
        img: data.img,
        bloodgroup: data.bloodgroup,
        previousClass: data.previousClass,
        yearofpass: data.yearofpass,
        board: data.board,
        school: data.school,
        grade: data.grade,
        classId: data.classId,
        sectionId: data.sectionId,
        sessionId: data.sessionId,
        document: "", // Add proper document handling
        tcdate: new Date(), // Add proper TC date handling
        tcNo: 0, // Add proper TC number handling
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        admissiondate: new Date(data.admissiondate),
        admissionno: data.admissionno,
        name: data.name,
        address: data.address,
        city: data.city,
        village: data.village,
        Sex: data.Sex,
        birthday: new Date(data.birthday),
        nationality: data.nationality,
        Religion: data.Religion,
        tongue: data.tongue,
        category: data.category,
        mothername: data.mothername,
        mphone: data.mphone,
        moccupation: data.moccupation,
        fathername: data.fathername,
        fphone: data.fphone,
        foccupation: data.foccupation,
        aadharcard: data.aadharcard,
        house: data.house,
        img: data.img,
        bloodgroup: data.bloodgroup,
        previousClass: data.previousClass,
        yearofpass: data.yearofpass,
        board: data.board,
        school: data.school,
        grade: data.grade,
        classId: data.classId,
        sectionId: data.sectionId,
        sessionId: data.sessionId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  
  try {
    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const recalculateMarks = async (type: 'junior' | 'senior' | 'higher') => {
  try {
    if (type === 'senior') {
      const marks = await prisma.seniorMark.findMany();
      
      for (const mark of marks) {
        // Calculate bestTwoPTAvg
        const ptScores = [mark.pt1, mark.pt2, mark.pt3]
          .filter((score): score is number => score !== null)
          .sort((a, b) => b - a);
        
        const bestTwoPTAvg = ptScores.length >= 2 ? 
          (ptScores[0] + ptScores[1]) / 2 : null;

        // Calculate best score (20 marks total)
        const bestScore = bestTwoPTAvg !== null ? 
          bestTwoPTAvg + 
          (mark.multipleAssessment || 0) + 
          (mark.portfolio || 0) + 
          (mark.subEnrichment || 0) : null;

        // Calculate grand total (best score + final exam)
        const grandTotal = bestScore !== null && mark.finalExam !== null ?
          bestScore + mark.finalExam : null;

        // Determine grade based on grand total
        let grade = null;
        if (grandTotal !== null) {
          if (grandTotal >= 91) grade = 'A1';
          else if (grandTotal >= 81) grade = 'A2';
          else if (grandTotal >= 71) grade = 'B1';
          else if (grandTotal >= 61) grade = 'B2';
          else if (grandTotal >= 51) grade = 'C1';
          else if (grandTotal >= 41) grade = 'C2';
          else if (grandTotal >= 33) grade = 'D';
          else grade = 'E';
        }
        
        // Update the mark record
        await prisma.seniorMark.update({
          where: { id: mark.id },
          data: {
            bestTwoPTAvg,
            bestScore,
            grandTotal,
            grade
          }
        });
      }
    } else if (type === 'higher') {
      const marks = await prisma.higherMark.findMany();
      
      for (const mark of marks) {
        const calculations = calculateHigherMarksAndGrade({
          unitTest1: mark.unitTest1,
          halfYearly: mark.halfYearly,
          unitTest2: mark.unitTest2,
          theory: mark.theory,
          practical: mark.practical
        });

        // Update the mark record
        await prisma.higherMark.update({
          where: { id: mark.id },
          data: {
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade
          }
        });
      }
    } else {
      // Existing junior marks recalculation logic
      const marks = await prisma.juniorMark.findMany({
        include: {
          halfYearly: true,
          yearly: true,
        }
      });

      for (const mark of marks) {
        // Half Yearly calculations
        if (mark.halfYearly) {
          const totalMarks = calculateTotalMarks(
            mark.halfYearly.ut1,
            mark.halfYearly.ut2,
            mark.halfYearly.noteBook,
            mark.halfYearly.subEnrichment,
            mark.halfYearly.examMarks
          );

          await prisma.halfYearlyMarks.update({
            where: { id: mark.halfYearly.id },
            data: {
              totalMarks,
              grade: calculateGrade(totalMarks)
            }
          });
        }

        // Yearly calculations
        if (mark.yearly) {
          const yearlytotalMarks = calculateTotalMarks(
            mark.yearly.ut3,
            mark.yearly.ut4,
            mark.yearly.yearlynoteBook,
            mark.yearly.yearlysubEnrichment,
            mark.yearly.yearlyexamMarks
          );

          await prisma.yearlyMarks.update({
            where: { id: mark.yearly.id },
            data: {
              yearlytotalMarks,
              yearlygrade: calculateGrade(yearlytotalMarks)
            }
          });
        }
      }
    }

    return { success: true, message: "Marks recalculated successfully" };
  } catch (error) {
    console.error("Error recalculating marks:", error);
    return { success: false, message: "Failed to recalculate marks" };
  }
}

function calculateTotalMarks(
  ut1?: number | null,
  ut2?: number | null,
  noteBook?: number | null,
  subEnrichment?: number | null,
  examMarks?: number | null
): number {
  const utAvg = ((ut1 || 0) + (ut2 || 0)) / 2 * 0.1; // 10%
  const internal = ((noteBook || 0) + (subEnrichment || 0)) * 0.1; // 20% (10% each)
  const exam = (examMarks || 0) * 0.7; // 70%
  return Math.round(utAvg + internal + exam);
}

function calculateGrade(totalMarks: number): string {
  if (totalMarks >= 91) return 'A1';
  if (totalMarks >= 81) return 'A2';
  if (totalMarks >= 71) return 'B1';
  if (totalMarks >= 61) return 'B2';
  if (totalMarks >= 51) return 'C1';
  if (totalMarks >= 41) return 'C2';
  if (totalMarks >= 33) return 'D';
  return 'F';
}

export const checkExistingSeniorMarks = async (
  data: { 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    const existingMarks = await prisma.seniorMark.findMany({
      where: {
        sectionSubjectId: data.sectionSubjectId,
        sessionId: data.sessionId
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createSeniorMarks = async (data: { marks: SeniorMarkSchema[] }) => {
  try {
    const createPromises = data.marks.map(async (mark) => {
      // Calculate marks and grade
      const calculations = calculateSeniorMarksAndGrade(mark);
      
      // Check for existing record first
      const existing = await prisma.seniorMark.findUnique({
        where: {
          studentId_sectionSubjectId_sessionId: {
            studentId: mark.studentId,
            sectionSubjectId: mark.sectionSubjectId,
            sessionId: mark.sessionId
          }
        }
      });

      if (existing) {
        // Update if exists
        return prisma.seniorMark.update({
          where: { id: existing.id },
          data: {
            pt1: mark.pt1,
            pt2: mark.pt2,
            pt3: mark.pt3,
            bestTwoPTAvg: calculations.bestTwoPTAvg,
            multipleAssessment: mark.multipleAssessment,
            portfolio: mark.portfolio,
            subEnrichment: mark.subEnrichment,
            bestScore: calculations.bestScore,
            finalExam: mark.finalExam,
            grandTotal: calculations.grandTotal,
            grade: calculations.grade,
            remarks: mark.remarks
          }
        });
      }

      // Create new record if doesn't exist
      return prisma.seniorMark.create({
        data: {
          student: { connect: { id: mark.studentId }},
          sectionSubject: { connect: { id: mark.sectionSubjectId }},
          session: { connect: { id: mark.sessionId }},
          pt1: mark.pt1,
          pt2: mark.pt2,
          pt3: mark.pt3,
          bestTwoPTAvg: calculations.bestTwoPTAvg,
          multipleAssessment: mark.multipleAssessment,
          portfolio: mark.portfolio,
          subEnrichment: mark.subEnrichment,
          bestScore: calculations.bestScore,
          finalExam: mark.finalExam,
          grandTotal: calculations.grandTotal,
          grade: calculations.grade,
          remarks: mark.remarks
        }
      });
    });

    await Promise.all(createPromises);
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateSeniorMarks = async (data: { marks: SeniorMarkSchema[] }) => {
  try {
    const updatePromises = data.marks.map(async (mark) => {
      return prisma.seniorMark.upsert({
        where: {
          studentId_sectionSubjectId_sessionId: {
            studentId: mark.studentId,
            sectionSubjectId: mark.sectionSubjectId,
            sessionId: mark.sessionId
          }
        },
        create: {
          student: { connect: { id: mark.studentId }},
          sectionSubject: { connect: { id: mark.sectionSubjectId }},
          session: { connect: { id: mark.sessionId }},
          pt1: mark.pt1,
          pt2: mark.pt2,
          pt3: mark.pt3,
          bestTwoPTAvg: mark.bestTwoPTAvg,
          multipleAssessment: mark.multipleAssessment,
          portfolio: mark.portfolio,
          subEnrichment: mark.subEnrichment,
          bestScore: mark.bestScore,
          finalExam: mark.finalExam,
          grandTotal: mark.grandTotal,
          grade: mark.grade,
          overallTotal: mark.overallTotal,
          overallMarks: mark.overallMarks,
          overallGrade: mark.overallGrade,
          remarks: mark.remarks
        },
        update: {
          pt1: mark.pt1,
          pt2: mark.pt2,
          pt3: mark.pt3,
          bestTwoPTAvg: mark.bestTwoPTAvg,
          multipleAssessment: mark.multipleAssessment,
          portfolio: mark.portfolio,
          subEnrichment: mark.subEnrichment,
          bestScore: mark.bestScore,
          finalExam: mark.finalExam,
          grandTotal: mark.grandTotal,
          grade: mark.grade,
          overallTotal: mark.overallTotal,
          overallMarks: mark.overallMarks,
          overallGrade: mark.overallGrade,
          remarks: mark.remarks
        }
      });
    });

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Senior Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteSeniorMark = async (
  data: { 
    studentId: string, 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    await prisma.seniorMark.delete({
      where: {
        studentId_sectionSubjectId_sessionId: {
          studentId: data.studentId,
          sectionSubjectId: data.sectionSubjectId,
          sessionId: data.sessionId
        }
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Mark deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Senior Mark Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const checkExistingHigherMarks = async (
  data: { 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    const existingMarks = await prisma.higherMark.findMany({
      where: {
        sectionSubjectId: data.sectionSubjectId,
        sessionId: data.sessionId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionno: true,
          }
        }
      }
    });

    return { 
      success: true, 
      error: false, 
      data: existingMarks 
    };
  } catch (err) {
    console.error("Check Existing Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const createHigherMarks = async (data: { marks: HigherMarkSchema[] }) => {
  try {
    const createPromises = data.marks
      .filter(mark => 
        mark.unitTest1 !== null || 
        mark.halfYearly !== null || 
        mark.unitTest2 !== null ||
        mark.theory !== null ||
        mark.practical !== null
      )
      .map(async (mark) => {
        const calculations = calculateHigherMarksAndGrade(mark);
        
        // Check for existing record
        const existing = await prisma.higherMark.findUnique({
          where: {
            studentId_sectionSubjectId_sessionId: {
              studentId: mark.studentId,
              sectionSubjectId: mark.sectionSubjectId,
              sessionId: mark.sessionId
            }
          }
        });

        if (existing) {
          // Update if exists
          return prisma.higherMark.update({
            where: { id: existing.id },
            data: {
              unitTest1: mark.unitTest1,
              halfYearly: mark.halfYearly,
              unitTest2: mark.unitTest2,
              theory: mark.theory,
              practical: mark.practical,
              totalWithout: calculations.totalWithout,
              grandTotal: calculations.grandTotal,
              total: calculations.total,
              percentage: calculations.percentage,
              grade: calculations.grade,
              overallGrade: calculations.overallGrade
            }
          });
        }

        // Create new record if doesn't exist
        return prisma.higherMark.create({
          data: {
            student: { connect: { id: mark.studentId }},
            sectionSubject: { connect: { id: mark.sectionSubjectId }},
            session: { connect: { id: mark.sessionId }},
            unitTest1: mark.unitTest1,
            halfYearly: mark.halfYearly,
            unitTest2: mark.unitTest2,
            theory: mark.theory,
            practical: mark.practical,
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade
          }
        });
    });

    await Promise.all(createPromises);
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const updateHigherMarks = async (data: { marks: HigherMarkSchema[] }) => {
  try {
    const updatePromises = data.marks
      .filter(mark => 
        mark.unitTest1 !== null || 
        mark.halfYearly !== null || 
        mark.unitTest2 !== null ||
        mark.theory !== null ||
        mark.practical !== null
      )
      .map(async (mark) => {
        const calculations = calculateHigherMarksAndGrade(mark);

        return prisma.higherMark.upsert({
          where: {
            studentId_sectionSubjectId_sessionId: {
              studentId: mark.studentId,
              sectionSubjectId: mark.sectionSubjectId,
              sessionId: mark.sessionId
            }
          },
          create: {
            student: { connect: { id: mark.studentId }},
            sectionSubject: { connect: { id: mark.sectionSubjectId }},
            session: { connect: { id: mark.sessionId }},
            unitTest1: mark.unitTest1,
            halfYearly: mark.halfYearly,
            unitTest2: mark.unitTest2,
            theory: mark.theory,
            practical: mark.practical,
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade
          },
          update: {
            unitTest1: mark.unitTest1,
            halfYearly: mark.halfYearly,
            unitTest2: mark.unitTest2,
            theory: mark.theory,
            practical: mark.practical,
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade
          }
        });
    });

    const results = await Promise.all(updatePromises);
    return { success: true, error: false, results };
  } catch (err) {
    console.error("Update Higher Marks Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const calculateHigherMarksAndGrade = (markData: Partial<HigherMarkSchema>) => {
  if (!markData) {
    return {
      totalWithout: null,
      grandTotal: null,
      total: null,
      percentage: null,
      grade: null
    };
  }

  // Calculate total without practical
  const totalWithout = 
    (markData.unitTest1 || 0) + 
    (markData.halfYearly || 0) + 
    (markData.unitTest2 || 0) +
    (markData.theory || 0);

  // Calculate grand total including practical
  const grandTotal = totalWithout + (markData.practical || 0);

  // Calculate total percentage
  const percentage = Math.round(grandTotal);

  // Calculate grade based on percentage
  let grade = null;
  if (percentage >= 91) grade = 'A1';
  else if (percentage >= 81) grade = 'A2';
  else if (percentage >= 71) grade = 'B1';
  else if (percentage >= 61) grade = 'B2';
  else if (percentage >= 51) grade = 'C1';
  else if (percentage >= 41) grade = 'C2';
  else if (percentage >= 33) grade = 'D';
  else grade = 'E';

  return {
    totalWithout,
    grandTotal,
    total: grandTotal,
    percentage,
    grade
  };
};

export const deleteHigherMark = async (
  data: { 
    studentId: string, 
    sectionSubjectId: number, 
    sessionId: number
  }
) => {
  try {
    await prisma.higherMark.delete({
      where: {
        studentId_sectionSubjectId_sessionId: {
          studentId: data.studentId,
          sectionSubjectId: data.sectionSubjectId,
          sessionId: data.sessionId
        }
      }
    });

    return { 
      success: true, 
      error: false,
      message: "Mark deleted successfully" 
    };
  } catch (err) {
    console.error("Delete Higher Mark Error:", err);
    return { 
      success: false, 
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};



