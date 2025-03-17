"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  StudentSchema,
  TeacherSchema,
  SubCategorySchema,
  SessionSchema,
  SectionSchema,
} from "./formValidationSchemas";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { Category } from "@prisma/client";
import { calculateMarksAndGrade , calculateSeniorMarksAndGrade} from './formValidationSchemas';
import { calculateHigherMarksAndGrade } from './markCalculations';

const prisma = new PrismaClient();

type CurrentState = { success: boolean; error: boolean };

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
      return { success: false, error: true, message: "Section ID is required" };
    }

    // Get current section subjects
    const currentSectionSubjects = await prisma.sectionSubject.findMany({
      where: { sectionId: formData.id },
      select: { id: true, subjectId: true }
    });

    // Get current subject IDs
    const currentSubjectIds = currentSectionSubjects.map(ss => ss.subjectId);
    
    // Get new subject IDs (handle undefined or null subjects)
    const newSubjectIds = formData.subjects || [];
    
    // Find subjects to add and remove
    const subjectsToAdd = newSubjectIds.filter(id => !currentSubjectIds.includes(id));
    const subjectsToRemove = currentSectionSubjects.filter(ss => !newSubjectIds.includes(ss.subjectId));

    await prisma.$transaction(async (tx) => {
      // Check if any SectionSubject to be deleted has related HigherMark records
      const sectionSubjectsWithMarks = [];
      
      for (const sectionSubject of subjectsToRemove) {
        const relatedHigherMarks = await tx.higherMark.findFirst({
          where: { sectionSubjectId: sectionSubject.id },
          select: { id: true }
        });

        const relatedSeniorMarks = await tx.seniorMark.findFirst({
          where: { sectionSubjectId: sectionSubject.id },
          select: { id: true }
        });
        
        // If this section subject has related marks, track it
        if (relatedHigherMarks || relatedSeniorMarks) {
          sectionSubjectsWithMarks.push(sectionSubject.subjectId);
        } else {
          // Only delete section subjects without related marks
          await tx.sectionSubject.delete({
            where: { id: sectionSubject.id }
          });
        }
      }

      // Add new section subjects
      for (const subjectId of subjectsToAdd) {
        await tx.sectionSubject.create({
          data: {
            sectionId: formData.id,
            subjectId
          }
        });
      }

      // Update section basic info
      await tx.section.update({
        where: { id: formData.id },
        data: {
          name: formData.name,
          classId: formData.classId
        }
      });

      // Return warning if some subjects couldn't be removed
      if (sectionSubjectsWithMarks.length > 0) {
        return { 
          success: true, 
          warning: true, 
          message: `Some subjects could not be removed because they have associated marks.`
        };
      }
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error updating section:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Unknown error occurred"
    };
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
      // Get existing subjects for the class
      const existingClassSubjects = await tx.classSubject.findMany({
        where: { classId: Number(data.id) },
        select: { 
          id: true,
          subjectId: true 
        }
      });

      // Find subjects that were removed
      const existingSubjectIds = existingClassSubjects.map(cs => cs.subjectId);
      const newSubjectIds = data.subjects?.map(id => Number(id)) || [];
      const removedSubjectIds = existingSubjectIds.filter(id => !newSubjectIds.includes(id));

      // Only delete JuniorMarks for removed subjects
      const removedClassSubjectIds = existingClassSubjects
        .filter(cs => removedSubjectIds.includes(cs.subjectId))
        .map(cs => cs.id);

      if (removedClassSubjectIds.length > 0) {
        await tx.juniorMark.deleteMany({
          where: {
            classSubjectId: {
              in: removedClassSubjectIds
            }
          }
        });

        // Delete the removed ClassSubject records
        await tx.classSubject.deleteMany({
          where: {
            id: {
              in: removedClassSubjectIds
            }
          }
        });
      }

      // Create new ClassSubject records for added subjects
      const subjectsToAdd = newSubjectIds.filter(id => !existingSubjectIds.includes(id));
      
      await tx.class.update({
        where: { id: Number(data.id) },
        data: {
          name: data.name,
          classNumber: Number(data.classNumber),
          capacity: Number(data.capacity),
          classSubjects: {
            create: subjectsToAdd.map(subjectId => ({
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
    // Get class and section names if they are provided
    let className = null;
    let sectionName = null;
    
    if (formData.assignedClassId) {
      const classData = await prisma.class.findUnique({
        where: { id: Number(formData.assignedClassId) },
        select: { name: true }
      });
      className = classData?.name;
    }

    if (formData.assignedSectionId) {
      const sectionData = await prisma.section.findUnique({
        where: { id: Number(formData.assignedSectionId) },
        select: { name: true }
      });
      sectionName = sectionData?.name;
    }

    // Create user in Clerk with enhanced metadata
    const user = await clerkClient().users.createUser({
      password: formData.password || Math.random().toString(36).slice(-8),
      firstName: formData.name,
      lastName: "",
      username: formData.name,
      publicMetadata: { 
        role: "teacher",
        assignedClass: className,
        assignedSection: sectionName
      },
    });

    // Create teacher in Prisma with both class and section
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
        password: formData.password || "",
        assignedClassId: formData.assignedClassId ? Number(formData.assignedClassId) : null,
        assignedSectionId: formData.assignedSectionId ? Number(formData.assignedSectionId) : undefined,
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
      return { success: false, error: true };
    }

    // Get class and section names if they are provided
    let className = null;
    let sectionName = null;
    
    if (formData.assignedClassId) {
      const classData = await prisma.class.findUnique({
        where: { id: Number(formData.assignedClassId) },
        select: { name: true }
      });
      className = classData?.name;
    }

    if (formData.assignedSectionId) {
      const sectionData = await prisma.section.findUnique({
        where: { id: Number(formData.assignedSectionId) },
        select: { name: true }
      });
      sectionName = sectionData?.name;
    }

    // Update Clerk user with enhanced metadata
    const clerkUpdateData: any = {
      firstName: formData.name,
      lastName: "",
      publicMetadata: { 
        role: "teacher",
        assignedClass: className,
        assignedSection: sectionName
      },
    };

    if (formData.password) {
      clerkUpdateData.password = formData.password;
    }

    await clerkClient().users.updateUser(formData.id, clerkUpdateData);

    // Update Prisma data
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
      assignedClassId: formData.assignedClassId ? Number(formData.assignedClassId) : null,
      assignedSectionId: formData.assignedSectionId ? Number(formData.assignedSectionId) : null,
    };

    await prisma.teacher.update({
      where: { id: formData.id },
      data: prismaUpdateData,
    });
      
    return { success: true, error: false };
  } catch (err) {
    console.error("Error updating teacher:", err);
    return { success: false, error: true };
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
        mothername: data.mothername || '',
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
    // Start a transaction to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      // Delete all JuniorMarks for this student
      await tx.juniorMark.deleteMany({
        where: { studentId: id }
      });

      // Delete all SeniorMarks for this student
      await tx.seniorMark.deleteMany({
        where: { studentId: id }
      });

      // Delete all HigherMarks for this student
      await tx.higherMark.deleteMany({
        where: { studentId: id }
      });

      // Finally delete the student
      await tx.student.delete({
        where: { id: id }
      });
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error deleting student:", err);
    return { success: false, error: true };
  }
};

// Modify the recalculateMarks function to handle batches on client side
export async function getMarksForRecalculation(type: 'junior' | 'senior' | 'higher', page: number, batchSize: number) {
  try {
    let marks;
    const skip = page * batchSize;

    switch (type) {
      case 'junior':
        marks = await prisma.juniorMark.findMany({
          skip,
          take: batchSize,
          include: {
            halfYearly: true,
            yearly: true,
          }
        });
        break;
      case 'senior':
        marks = await prisma.seniorMark.findMany({
          skip,
          take: batchSize,
        });
        break;
      case 'higher':
        marks = await prisma.higherMark.findMany({
          skip,
          take: batchSize,
        });
        break;
    }

    let total: number;
    switch (type) {
      case 'junior':
        total = await prisma.juniorMark.count();
        break;
      case 'senior':
        total = await prisma.seniorMark.count();
        break;
      case 'higher':
        total = await prisma.higherMark.count();
        break;
      default:
        total = 0;
    }

    return { 
      success: true, 
      data: marks, 
      total,
      remainingPages: Math.ceil((total - (skip + batchSize)) / batchSize)
    };
  } catch (error) {
    console.error("Error fetching marks:", error);
    return { success: false, error: "Failed to fetch marks" };
  }
}

export async function updateCalculatedMarks(type: 'junior' | 'senior' | 'higher', updates: any[]) {
  try {
    const results = await Promise.all(
      updates.map(async (update) => {
        switch (type) {
          case 'junior':
            if (update.halfYearly) {
              await prisma.halfYearlyMarks.update({
                where: { id: update.halfYearly.id },
                data: {
                  totalMarks: update.halfYearly.totalMarks,
                  grade: update.halfYearly.grade
                }
              });
            }
            if (update.yearly) {
              await prisma.yearlyMarks.update({
                where: { id: update.yearly.id },
                data: {
                  yearlytotalMarks: update.yearly.totalMarks,
                  yearlygrade: update.yearly.grade
                }
              });
            }
            await prisma.juniorMark.update({
              where: { id: update.id },
              data: {
                grandTotalMarks: update.grandTotalMarks,
                grandTotalGrade: update.grandTotalGrade,
                overallPercentage: update.overallPercentage
              }
            });
            break;

          case 'senior':
            await prisma.seniorMark.update({
              where: { id: update.id },
              data: {
                bestTwoPTAvg: update.bestTwoPTAvg,
                bestScore: update.bestScore,
                grandTotal: update.grandTotal,
                grade: update.grade,
                overallGrade: update.grade
              }
            });
            break;

          case 'higher':
            await prisma.higherMark.update({
              where: { id: update.id },
              data: {
                totalWithout: update.totalWithout,
                grandTotal: update.grandTotal,
                total: update.total,
                percentage: update.percentage,
                grade: update.grade,
                overallGrade: update.overallGrade
              }
            });
            break;
        }
      })
    );

    return { success: true, message: "Batch update completed" };
  } catch (error) {
    console.error("Error updating marks:", error);
    return { success: false, error: "Failed to update marks" };
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



