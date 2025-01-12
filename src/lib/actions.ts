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
    // Get class name if assignedClassId is provided
    let className = null;
    if (formData.assignedClassId) {
      const classData = await prisma.class.findUnique({
        where: { id: Number(formData.assignedClassId) },
        select: { name: true }
      });
      className = classData?.name;
    }

    // Create user in Clerk with required fields
    const user = await clerkClient().users.createUser({
      password: formData.password || Math.random().toString(36).slice(-8),
      firstName: formData.name,
      lastName: "",
      username: formData.name,
      publicMetadata: { 
        role: "teacher",
        assignedClass: className
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
        password: formData.password || "",
        assignedClassId: formData.assignedClassId ? Number(formData.assignedClassId) : null,
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

    // Get class name if assignedClassId is provided
    let className = null;
    if (formData.assignedClassId) {
      const classData = await prisma.class.findUnique({
        where: { id: Number(formData.assignedClassId) },
        select: { name: true }
      });
      className = classData?.name;
    }

    // Only update Clerk user if necessary fields changed
    const clerkUpdateData: any = {
      firstName: formData.name,
      lastName: "",
      publicMetadata: { 
        role: "teacher",
        assignedClass: className
      },
    };

    // Only include password if it's provided
    if (formData.password) {
      clerkUpdateData.password = formData.password;
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
      assignedClassId: formData.assignedClassId ? Number(formData.assignedClassId) : null,
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
      
    return { success: true, error: false };
  } catch (err: any) {
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
            grade,
            overallGrade: grade
          }
        });
      }
    } else if (type === 'higher') {
      const marks = await prisma.higherMark.findMany();
      
      const updatePromises = marks.map(async (mark) => {
        const calculations = calculateHigherMarksAndGrade({
          unitTest1: mark.unitTest1,
          halfYearly: mark.halfYearly,
          unitTest2: mark.unitTest2,
          theory: mark.theory,
          practical: mark.practical
        });

        return prisma.higherMark.update({
          where: { id: mark.id },
          data: {
            totalWithout: calculations.totalWithout,
            grandTotal: calculations.grandTotal,
            total: calculations.total,
            percentage: calculations.percentage,
            grade: calculations.grade,
            overallGrade: calculations.overallGrade
          }
        });
      });

      await Promise.all(updatePromises);
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



