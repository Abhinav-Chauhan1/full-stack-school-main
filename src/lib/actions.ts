"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  JuniorMarkSchema,
  SubCategorySchema,
  SessionSchema,
  SectionSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { Category, ExamType } from "@prisma/client";

type CurrentState = { success: boolean; error: boolean };



export const createJuniorMarks = async (
  currentState: CurrentState,
  data: { marks: JuniorMarkSchema[] }
) => {
  try {
    // Create marks for each student
    const createdMarks = await prisma.juniorMark.createMany({
      data: data.marks.map(mark => ({
        studentId: mark.studentId,
        classSubjectId: mark.classSubjectId,
        examType: mark.examType,
        sessionId: mark.sessionId,
        ut1: mark.ut1,
        ut2: mark.ut2,
        ut3: mark.ut3,
        ut4: mark.ut4,
        noteBook: mark.noteBook,
        subEnrichment: mark.subEnrichment,
        examMarks: mark.examMarks,
        totalMarks: mark.totalMarks,
        grade: mark.grade,
        remarks: mark.remarks,
      })),
      skipDuplicates: true, // Optional: skip if entry already exists
    });

    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

export const updateJuniorMarks = async (
  currentState: CurrentState,
  data: { marks: JuniorMarkSchema[] }
) => {
  try {
    // Update marks for each student
    const updatePromises = data.marks.map(async (mark) => {
      return prisma.juniorMark.upsert({
        where: {
          // Unique constraint from the schema
          studentId_classSubjectId_examType_sessionId: {
            studentId: mark.studentId,
            classSubjectId: mark.classSubjectId,
            examType: mark.examType,
            sessionId: mark.sessionId,
          }
        },
        update: {
          ut1: mark.ut1,
          ut2: mark.ut2,
          ut3: mark.ut3,
          ut4: mark.ut4,
          noteBook: mark.noteBook,
          subEnrichment: mark.subEnrichment,
          examMarks: mark.examMarks,
          totalMarks: mark.totalMarks,
          grade: mark.grade,
          remarks: mark.remarks,
        },
        create: {
          studentId: mark.studentId,
          classSubjectId: mark.classSubjectId,
          examType: mark.examType,
          sessionId: mark.sessionId,
          ut1: mark.ut1,
          ut2: mark.ut2,
          ut3: mark.ut3,
          ut4: mark.ut4,
          noteBook: mark.noteBook,
          subEnrichment: mark.subEnrichment,
          examMarks: mark.examMarks,
          totalMarks: mark.totalMarks,
          grade: mark.grade,
          remarks: mark.remarks,
        }
      });
    });

    await Promise.all(updatePromises);

    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

export const deleteJuniorMarks = async (
  currentState: CurrentState,
  data: { studentId: string; classSubjectId: number; examType: string; sessionId: number }
) => {
  try {
    const { studentId, classSubjectId, examType, sessionId } = data;

    if (!studentId || !classSubjectId || !examType || !sessionId) {
      throw new Error("Missing required parameters");
    }

    await prisma.juniorMark.delete({
      where: {
        studentId_classSubjectId_examType_sessionId: {
          studentId: studentId,
          classSubjectId: classSubjectId,
          examType: examType as ExamType,
          sessionId: sessionId,
        }
      }
    });

    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
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
    if (!formData.name || !formData.classId) {
      return { success: false, error: true};
    }

    await prisma.section.create({
      data: {
        name: formData.name,
        classId: parseInt(formData.classId.toString()),
        sectionSubjects: {
          create: formData.subjects?.map((subjectId) => ({
            subject: { connect: { id: subjectId } }
          })) || [],
        },
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error("Error creating section:", err);
    return {
      success: false,
      error: true
    };
  }
};

export const updateSection = async (
  currentState: { success: boolean; error: boolean },
  formData: SectionSchema
) => {
  try {
    if (!formData.id) {
      return { success: false, error: true};
    }

    const sectionId = parseInt(formData.id.toString());

    // Start a transaction
    await prisma.$transaction(async (prisma) => {
      // First, delete related SeniorMark records
      await prisma.seniorMark.deleteMany({
        where: {
          sectionSubject: {
            sectionId: sectionId
          }
        }
      });

      // Then, delete existing sectionSubjects
      await prisma.sectionSubject.deleteMany({
        where: { sectionId },
      });

      // Finally, update section and create new sectionSubjects
      await prisma.section.update({
        where: { id: sectionId },
        data: {
          name: formData.name,
          classId: parseInt(formData.classId.toString()),
          sectionSubjects: {
            create: formData.subjects?.map((subjectId) => ({
              subject: { connect: { id: subjectId } }
            })) || [],
          },
        },
      });
    });

    return { success: true, error: false};
  } catch (err) {
    console.error("Error updating section:", err);
    return {
      success: false,
      error: true
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



export const createJuniorMark = async (
  currentState: CurrentState,
  data: JuniorMarkSchema
) => {
  try {
    await prisma.juniorMark.create({
      data: {
        student: { connect: { id: data.studentId } },
        classSubject: { connect: { id: data.classSubjectId } },
        session: { connect: { id: data.sessionId } },
        examType: data.examType,
        ut1: data.ut1,
        ut2: data.ut2,
        ut3: data.ut3,
        ut4: data.ut4,
        noteBook: data.noteBook,
        subEnrichment: data.subEnrichment,
        examMarks: data.examMarks,
        totalMarks: data.totalMarks,
        grade: data.grade,
        remarks: data.remarks,
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { 
      success: false, 
      error: true
    };
  }
};

// Update JuniorMark
export const updateJuniorMark = async (
  currentState: CurrentState,
  data: JuniorMarkSchema
) => {
  if (!data.id) {
    return { success: false, error: true};
  }

  try {
    await prisma.juniorMark.update({
      where: {
        id: data.id,
      },
      data: {
        student: { connect: { id: data.studentId } },
        classSubject: { connect: { id: data.classSubjectId } },
        session: { connect: { id: data.sessionId } },
        examType: data.examType,
        ut1: data.ut1,
        ut2: data.ut2,
        ut3: data.ut3,
        ut4: data.ut4,
        noteBook: data.noteBook,
        subEnrichment: data.subEnrichment,
        examMarks: data.examMarks,
        totalMarks: data.totalMarks,
        grade: data.grade,
        remarks: data.remarks,
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { 
      success: false, 
      error: true 
    };
  }
};

// Delete JuniorMark
export const deleteJuniorMark = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id");
  
  if (!id) {
    return { success: false, error: true};
  }

  try {
    await prisma.juniorMark.delete({
      where: {
        id: parseInt(id.toString()),
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
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
    await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { success: false, error: true};
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      },
    });

    return { success: true, error: false};
  } catch (err) {
    console.error(err);
    return { success: false, error: true};
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
        capacity: Number(data.capacity),
        classNumber: Number(data.classNumber),
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
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: { success: boolean; error: boolean },
  data: ClassSchema
) => {
  try {
    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // First, find all ClassSubject IDs for this class
      const classSubjects = await tx.classSubject.findMany({
        where: { classId: Number(data.id) },
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
        where: { classId: Number(data.id) }
      });

      // Finally, update the class and create new relationships
      await tx.class.update({
        where: { id: Number(data.id) },
        data: {
          name: data.name,
          capacity: Number(data.capacity),
          classNumber: Number(data.classNumber),
          classSubjects: {
            create: data.subjects.map((subjectId: number) => ({
              subject: { connect: { id: subjectId } }
            }))
          }
        },
      });
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
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
    // Validate required fields
    if (!formData.name || !formData.email || !formData.password) {
      return { success: false, error: true};
    }

    // Create user in Clerk with required fields
    const user = await clerkClient().users.createUser({
      password: formData.password,
      firstName: formData.name,
      lastName: "", // Required by Clerk, using empty string as default
      username: formData.name, // Generate username from email
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
        createdAt: new Date(),
        password: formData.password, // Store hashed password in Prisma
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error creating teacher:", err);
    return { 
      success: false, 
      error: true, 
    };
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

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
