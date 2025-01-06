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
  classSubjectId: z.number().int().positive("Invalid Class Subject"),
  sessionId: z.number().int().positive("Invalid Session"),
  examType: z.enum(["HALF_YEARLY", "YEARLY"]),
  halfYearly: z.object({
    ut1: z.number().min(0).max(10).nullable(),
    ut2: z.number().min(0).max(10).nullable(),
    noteBook: z.number().min(0).max(5).nullable(),
    subEnrichment: z.number().min(0).max(5).nullable(),
    examMarks: z.number().min(0).max(80).nullable(),
    totalMarks: z.number().nullable(),
    grade: z.string().nullable(),
    remarks: z.string().nullable()
  }).nullable(),
  yearly: z.object({
    ut3: z.number().min(0).max(10).nullable(),
    ut4: z.number().min(0).max(10).nullable(),
    yearlynoteBook: z.number().min(0).max(5).nullable(),
    yearlysubEnrichment: z.number().min(0).max(5).nullable(),
    yearlyexamMarks: z.number().min(0).max(80).nullable(),
    yearlytotalMarks: z.number().nullable(),
    yearlygrade: z.string().nullable(),
    yearlyremarks: z.string().nullable()
  }).nullable(),
  grandTotalMarks: z.number().nullable(),
  grandTotalGrade: z.string().nullable(),
  overallPercentage: z.number().nullable()
});

export type JuniorMarkSchema = z.infer<typeof juniorMarkSchema>;

// Helper function to calculate marks and grade
export const calculateMarksAndGrade = (markData: any) => {
  const examType = markData.examType;
  const marks = markData[examType === "HALF_YEARLY" ? "halfYearly" : "yearly"];
  const existingHalfYearly = markData.halfYearly; // Get existing half yearly marks
  
  if (!marks) return {
    totalMarks: null,
    grade: null,
    grandTotalMarks: null,
    grandTotalGrade: null,
    overallPercentage: null
  };

  let totalMarks = 0;
  let grade = '';
  let grandTotalMarks = null;
  let grandTotalGrade = null;
  let overallPercentage = null;

  // Calculate total marks based on exam type
  if (examType === "HALF_YEARLY") {
    // Get best score from UT1 and UT2
    const bestUT = Math.max(
      Math.min(10, (Number(marks.ut1) || 0)),
      Math.min(10, (Number(marks.ut2) || 0))
    );
    
    // Calculate total: Best UT (10) + Notebook (5) + SubEnrichment (5) + ExamMarks (80) = Total (100)
    totalMarks = 
      bestUT + // Best UT score
      Math.min(5, (Number(marks.noteBook) || 0)) +
      Math.min(5, (Number(marks.subEnrichment) || 0)) +
      Math.min(80, (Number(marks.examMarks) || 0));

    // Update the marks object with calculated total
    marks.totalMarks = totalMarks;
  } else {
    // Get best score from UT3 and UT4
    const bestUT = Math.max(
      Math.min(10, (Number(marks.ut3) || 0)),
      Math.min(10, (Number(marks.ut4) || 0))
    );
    
    // Calculate total: Best UT (10) + Notebook (5) + SubEnrichment (5) + ExamMarks (80) = Total (100)
    totalMarks = 
      bestUT + // Best UT score
      Math.min(5, (Number(marks.yearlynoteBook) || 0)) +
      Math.min(5, (Number(marks.yearlysubEnrichment) || 0)) +
      Math.min(80, (Number(marks.yearlyexamMarks) || 0));

    // Update the marks object with calculated total
    marks.yearlytotalMarks = totalMarks;
  }

  // Calculate grade based on percentage
  const percentage = totalMarks; // Since total is already out of 100
  if (percentage >= 91) grade = 'A1';
  else if (percentage >= 81) grade = 'A2';
  else if (percentage >= 71) grade = 'B1';
  else if (percentage >= 61) grade = 'B2';
  else if (percentage >= 51) grade = 'C1';
  else if (percentage >= 41) grade = 'C2';
  else if (percentage >= 33) grade = 'D';
  else grade = 'E';

  // Update grade in marks object
  if (examType === "HALF_YEARLY") {
    marks.grade = grade;
  } else {
    marks.yearlygrade = grade;
  }

  // Update grand total calculations based on exam type
  if (examType === "YEARLY" && existingHalfYearly?.totalMarks) {
    // For yearly exam, calculate grand total as half yearly + yearly marks
    grandTotalMarks = totalMarks + existingHalfYearly.totalMarks;
    // Calculate overall percentage based on total possible marks (200)
  } else if (examType === "HALF_YEARLY") {
    // For half yearly, only store the current total marks
    grandTotalMarks = totalMarks;
  }

  return {
    totalMarks,
    grade,
    grandTotalMarks,
    grandTotalGrade,
    overallPercentage
  };
};

export const seniorMarkSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  sectionSubjectId: z.number().int().positive("Invalid Section Subject"),
  sessionId: z.number().int().positive("Invalid Session"),
  pt1: z.number().min(0).max(5).nullable(),
  pt2: z.number().min(0).max(5).nullable(),
  pt3: z.number().min(0).max(5).nullable(),
  bestTwoPTAvg: z.number().nullable(),
  multipleAssessment: z.number().min(0).max(5).nullable(),
  portfolio: z.number().min(0).max(5).nullable(),
  subEnrichment: z.number().min(0).max(5).nullable(),
  bestScore: z.number().nullable(),
  finalExam: z.number().min(0).max(80).nullable(),
  grandTotal: z.number().nullable(),
  grade: z.string().nullable(),
  overallTotal: z.number().nullable(),
  overallMarks: z.number().nullable(),
  overallGrade: z.string().nullable(),
  remarks: z.string().nullable()
});

export type SeniorMarkSchema = z.infer<typeof seniorMarkSchema>;

// Helper function to calculate senior marks and grade
export const calculateSeniorMarksAndGrade = (markData: Partial<SeniorMarkSchema>) => {
  if (!markData) {
    return {
      bestTwoPTAvg: null,
      bestScore: null,
      grandTotal: null,
      grade: null
    };
  }

  // Convert PT scores to numbers, limiting each to max 5
  const ptScores = [
    markData.pt1 !== null ? Math.min(5, Number(markData.pt1)) : null,
    markData.pt2 !== null ? Math.min(5, Number(markData.pt2)) : null,
    markData.pt3 !== null ? Math.min(5, Number(markData.pt3)) : null
  ].filter((score): score is number => score !== null);

  // Calculate best two PT average
  let bestTwoPTAvg = null;
  if (ptScores.length >= 2) {
    const sortedScores = [...ptScores].sort((a, b) => b - a);
    bestTwoPTAvg = ((sortedScores[0] + sortedScores[1]) / 2);
  }

  // Calculate other components (each out of 5)
  const multipleAssessment = markData.multipleAssessment !== null ? 
    Math.min(5, Number(markData.multipleAssessment)) : null;
  const portfolio = markData.portfolio !== null ? 
    Math.min(5, Number(markData.portfolio)) : null;
  const subEnrichment = markData.subEnrichment !== null ? 
    Math.min(5, Number(markData.subEnrichment)) : null;
  
  // Calculate final exam (out of 80)
  const finalExam = markData.finalExam !== null ? 
    Math.min(80, Number(markData.finalExam)) : null;

  // Calculate best score (out of 20: PT avg + MA + Portfolio + SE)
  const bestScore = (bestTwoPTAvg !== null && multipleAssessment !== null && 
    portfolio !== null && subEnrichment !== null) ?
    bestTwoPTAvg + multipleAssessment + portfolio + subEnrichment :
    null;

  // Calculate grand total (simply add best score and final exam)
  const grandTotal = (bestScore !== null && finalExam !== null) ?
    bestScore + finalExam :
    null;

  // Calculate grade based on percentage
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

  return {
    bestTwoPTAvg,
    bestScore,
    grandTotal,
    grade
  };
};

export const higherMarkSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  sectionSubjectId: z.number().int().positive("Invalid Section Subject"),
  sessionId: z.number().int().positive("Invalid Session"),
  unitTest1: z.number().min(0).max(10).nullable(),
  halfYearly: z.number().min(0).max(30).nullable(),
  unitTest2: z.number().min(0).max(10).nullable(),
  theory: z.number().min(0).max(35).nullable(),
  practical: z.number().min(0).max(15).nullable(),
  totalWithout: z.number().nullable(),
  grandTotal: z.number().nullable(),
  total: z.number().nullable(),
  percentage: z.number().nullable(),
  grade: z.string().nullable(),
  overallGrade: z.string().nullable()
});

export type HigherMarkSchema = z.infer<typeof higherMarkSchema>;

// Update the calculation helper function
export const calculateHigherMarksAndGrade = (markData: Partial<HigherMarkSchema>) => {
  if (!markData) {
    return {
      totalWithout: null,
      grandTotal: null,
      total: null,
      percentage: null,
      grade: null,
      overallGrade: null  // Add this
    };
  }

  // Validate and normalize input values
  const ut1 = typeof markData.unitTest1 === 'number' ? Math.min(10, Math.max(0, markData.unitTest1)) : 0;
  const halfYearly = typeof markData.halfYearly === 'number' ? Math.min(30, Math.max(0, markData.halfYearly)) : 0;
  const ut2 = typeof markData.unitTest2 === 'number' ? Math.min(10, Math.max(0, markData.unitTest2)) : 0;
  const theory = typeof markData.theory === 'number' ? Math.min(35, Math.max(0, markData.theory)) : 0;
  const practical = typeof markData.practical === 'number' ? Math.min(15, Math.max(0, markData.practical)) : 0;

  const totalWithout = ut1 + halfYearly + ut2 + theory;
  const grandTotal = totalWithout + practical;
  const percentage = Math.round(grandTotal);

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
    grade,
    overallGrade: grade  // Add this
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
  classNumber: z.coerce.number().min(0, { message: "Class number is required!" }),
  subjects: z.array(z.number()).min(1, "At least one subject is required"),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  Sex: z.enum(["Male", "Female", "Other"]),
  FatherHusband: z.enum(["Father", "Husband"]),
  birthday: z.string().transform(str => new Date(str)),
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
  joiningdate: z.string().transform(str => new Date(str)),
  designation: z.string().min(1, "Designation is required"),
  qualification: z.string().min(1, "Qualification is required"),
  EmployeeType: z.enum(["Permanent", "Temporarily", "Peon"]),
  password: z.string().min(6).optional(),
  img: z.string().optional(),
  createdAt: z.string().optional().transform(str => str ? new Date(str) : new Date()),
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
  id: z.number().optional(),
  name: z.string().min(1, "Section name is required"),
  classId: z.coerce.number().min(1, "Class is required"),
  subjects: z.array(z.number()).optional(),
});

export type SectionSchema = z.infer<typeof sectionSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  admissiondate: z.string().transform(str => new Date(str)),
  admissionno: z.string().transform(str => parseInt(str, 10)),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  village: z.string().min(1, "Village is required"),
  Sex: z.enum(["Male", "Female", "Other"]),
  birthday: z.string().transform(str => new Date(str)),
  nationality: z.string().default("Indian"),
  Religion: z.enum(["Hindu", "Muslim", "Christian", "Sikh", "Usmani", "Raeen", "MominAnsar"]),
  tongue: z.enum(["Hindi", "English", "Punjabi", "Urdu", "Bhojpuri", "Gujarati"]),
  category: z.enum(["General", "SC", "ST", "OBC", "Other"]),
  mothername: z.string().optional(),
  mphone: z.string().optional().transform(val => val || null),
  moccupation: z.string().optional(),
  fathername: z.string().optional(),
  fphone: z.string().optional().transform(val => val || null),
  foccupation: z.string().optional(),
  aadharcard: z.string().optional(),
  house: z.string().optional(),
  bloodgroup: z.enum([
    "A_plus", "A_minus", 
    "B_plus", "B_minus", 
    "O_plus", "O_minus", 
    "AB_plus", "AB_minus"
  ]),
  previousClass: z.string().optional(),
  yearofpass: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return 0;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number()
  ),
  board: z.string().optional(),
  school: z.string().optional(),
  grade: z.string().optional(),
  classId: z.string().transform(str => parseInt(str, 10)),
  sectionId: z.string().transform(str => parseInt(str, 10)),
  sessionId: z.string().transform(str => parseInt(str, 10)),
  img: z.string().optional(),
  subcategoryId: z.number().optional(),
  document: z.string().optional(),
  tc: z.boolean().optional().default(true).optional(),
  tcdate: z.date().optional().default(() => new Date()).optional(),
  tcNo: z.number().optional().default(0).optional()
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
