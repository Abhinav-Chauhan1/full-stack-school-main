import { z } from "zod";
import { Category } from "@prisma/client";

export const subCategorySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  category: z.nativeEnum(Category, {
    required_error: "Category is required",
  }),
});

export type SubCategorySchema = z.infer<typeof subCategorySchema>;


export const juniorMarkSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classSubjectId: z.number({ required_error: "Subject is required" }),
  sessionId: z.number({ required_error: "Session is required" }),
  examType: z.enum(["HALF_YEARLY", "YEARLY"], { 
    required_error: "Exam type is required" 
  }),
  ut1: z.number().min(0).max(10).optional(),
  ut2: z.number().min(0).max(10).optional(),
  ut3: z.number().min(0).max(10).optional(),
  ut4: z.number().min(0).max(10).optional(),
  noteBook: z.number().min(0).max(10).optional(),
  subEnrichment: z.number().min(0).max(10).optional(),
  examMarks: z.number().min(0).max(50).optional(),
  remarks: z.string().optional(),
});

export type JuniorMarkSchema = z.infer<typeof juniorMarkSchema>;

// Helper function to calculate total marks and grade
export const calculateMarksAndGrade = (marks: Partial<JuniorMarkSchema>) => {
  const ut1 = marks.ut1 || 0;
  const ut2 = marks.ut2 || 0;
  const ut3 = marks.ut3 || 0;
  const ut4 = marks.ut4 || 0;
  const noteBook = marks.noteBook || 0;
  const subEnrichment = marks.subEnrichment || 0;
  const examMarks = marks.examMarks || 0;

  const totalMarks = ut1 + ut2 + ut3 + ut4 + noteBook + subEnrichment + examMarks;

  const calculateGrade = (total: number) => {
    if (total >= 91) return 'A1';
    if (total >= 81) return 'A2';
    if (total >= 71) return 'B1';
    if (total >= 61) return 'B2';
    if (total >= 51) return 'C1';
    if (total >= 41) return 'C2';
    if (total >= 33) return 'D';
    if (total >= 21) return 'E1';
    return 'E2';
  };

  return {
    totalMarks: parseFloat(totalMarks.toFixed(2)),
    grade: calculateGrade(totalMarks)
  };
};


export const subjectSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  description: z.string().optional(),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  classNumber: z.coerce.number(),
  subjects: z.array(z.number()).min(1, "At least one subject is required"),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(), // Changed to string to match Clerk ID
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(), // Optional for updates
  Sex: z.enum(["Male", "Female", "Other"]),
  FatherHusband: z.enum(["Father", "Husband"]),
  birthday: z.string().transform(str => new Date(str)), // Changed to string to match form date input
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  bloodgroup: z.enum([
    "A_plus", "A_minus", 
    "B_plus", "B_minus", 
    "O_plus", "O_minus", 
    "AB_plus", "AB_minus"
  ]),
  joiningdate: z.string().transform(str => new Date(str)), // Changed to string to match form date input
  designation: z.string().min(1, "Designation is required"),
  qualification: z.string().min(1, "Qualification is required"),
  EmployeeType: z.enum(["Permanent", "Temporarily", "Peon"]),
  img: z.string().optional(),
  createdAt: z.string().optional().transform(str => str ? new Date(str) : new Date()), // Optional as it's set server-side
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const sessionSchema = z.object({
  id: z.coerce.number().optional(),
  sessionfrom: z.coerce.date(),
  sessionto: z.coerce.date(),
  sessioncode: z.string().min(1, "Session code is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
});

export type SessionSchema = z.infer<typeof sessionSchema>;

export const sectionSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  classId: z.coerce.number().min(1, "Class is required"),
  subjects: z.array(z.number()).optional(),
  id: z.number().optional(),
});

export type SectionSchema = z.infer<typeof sectionSchema>;




export const studentSchema = z.object({
  id: z.string().optional(),
  // Required fields from the form
  admissiondate: z.string().transform((str) => new Date(str)),
  admissionno: z.string().transform((str) => parseInt(str, 10)), // Convert string to number
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  village: z.string().min(1, "Village is required"),
  Sex: z.enum(["Male", "Female", "Other"]),
  birthday: z.string().transform((str) => new Date(str)),
  nationality: z.string().default("Indian"),
  Religion: z.enum(["Hindu", "Muslim", "Christian", "Sikh", "Usmani", "Raeen", "MominAnsar"]),
  tongue: z.enum(["Hindi", "English", "Punjabi", "Urdu", "Bhojpuri", "Gujarati"]),
  category: z.enum(["General", "SC", "ST", "OBC", "Other"]),
  mothername: z.string().min(1, "Mother's name is required"),
  mphone: z.string().min(10, "Invalid phone number"),
  moccupation: z.string().min(1, "Mother's occupation is required"),
  fathername: z.string().min(1, "Father's name is required"),
  fphone: z.string().min(10, "Invalid phone number"),
  foccupation: z.string().min(1, "Father's occupation is required"),
  aadharcard: z.string().min(12, "Invalid Aadhar card number"),
  house: z.string().min(1, "House is required"),
  bloodgroup: z.enum([
    "A_plus",
    "A_minus",
    "B_plus",
    "B_minus",
    "O_plus",
    "O_minus",
    "AB_plus",
    "AB_minus"
  ]),
  previousClass: z.string().optional(),
  yearofpass: z.string().transform((str) => parseInt(str, 10)), // Convert string to number
  board: z.string().min(1, "Board is required"),
  school: z.string().min(1, "School is required"),
  grade: z.string().min(1, "Grade is required"),
  
  // Form selections - convert strings to numbers
  classId: z.string().transform((str) => parseInt(str, 10)),
  sectionId: z.string().transform((str) => parseInt(str, 10)),
  sessionId: z.string().transform((str) => parseInt(str, 10)),
  
  // Optional fields
  img: z.string().optional(),
  subcategoryId: z.number().optional(),
  
  // These fields are in the Prisma schema but not in the form
  document: z.string().optional(),
  tc: z.boolean().optional().default(true),
  tcdate: z.date().optional().default(() => new Date()),
  tcNo: z.number().optional().default(0)
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;
