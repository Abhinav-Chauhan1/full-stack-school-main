-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('Hindu', 'Muslim', 'Christian', 'Sikh', 'Usmani', 'Raeen', 'MominAnsar');

-- CreateEnum
CREATE TYPE "UserSex" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_plus', 'A_minus', 'B_plus', 'B_minus', 'O_plus', 'O_minus', 'AB_plus', 'AB_minus');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('General', 'SC', 'ST', 'OBC', 'Other');

-- CreateEnum
CREATE TYPE "MotherTongue" AS ENUM ('Hindi', 'English', 'Punjabi', 'Urdu', 'Bhojpuri', 'Gujarati');

-- CreateEnum
CREATE TYPE "FatherHusband" AS ENUM ('Father', 'Husband');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('Permanent', 'Temporarily', 'Peon');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "Sex" "UserSex" NOT NULL,
    "FatherHusband" "FatherHusband" NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "bloodgroup" "BloodGroup" NOT NULL,
    "joiningdate" TIMESTAMP(3) NOT NULL,
    "designation" TEXT,
    "qualification" TEXT,
    "EmployeeType" "EmployeeType" NOT NULL,
    "img" TEXT,
    "assignedClassId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "admissiondate" TIMESTAMP(3) NOT NULL,
    "admissionno" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "Sex" "UserSex" NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Indian',
    "Religion" "Religion" NOT NULL,
    "tongue" "MotherTongue" NOT NULL,
    "category" "Category" NOT NULL,
    "subcategoryId" INTEGER,
    "mothername" TEXT,
    "mphone" TEXT,
    "moccupation" TEXT,
    "fathername" TEXT,
    "fphone" TEXT,
    "foccupation" TEXT,
    "aadharcard" TEXT,
    "house" TEXT,
    "img" TEXT,
    "bloodgroup" "BloodGroup" NOT NULL,
    "previousClass" TEXT,
    "yearofpass" INTEGER,
    "board" TEXT,
    "school" TEXT,
    "grade" TEXT,
    "document" TEXT,
    "tc" BOOLEAN DEFAULT true,
    "tcdate" TIMESTAMP(3),
    "tcNo" INTEGER,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "sessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSubject" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuniorMark" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classSubjectId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "grandTotalMarks" DOUBLE PRECISION,
    "grandTotalGrade" TEXT,
    "overallPercentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuniorMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HalfYearlyMarks" (
    "id" TEXT NOT NULL,
    "juniorMarkId" TEXT NOT NULL,
    "ut1" DOUBLE PRECISION,
    "ut2" DOUBLE PRECISION,
    "noteBook" DOUBLE PRECISION,
    "subEnrichment" DOUBLE PRECISION,
    "examMarks" DOUBLE PRECISION,
    "totalMarks" DOUBLE PRECISION,
    "grade" TEXT,
    "remarks" TEXT,

    CONSTRAINT "HalfYearlyMarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearlyMarks" (
    "id" TEXT NOT NULL,
    "juniorMarkId" TEXT NOT NULL,
    "ut3" DOUBLE PRECISION,
    "ut4" DOUBLE PRECISION,
    "yearlynoteBook" DOUBLE PRECISION,
    "yearlysubEnrichment" DOUBLE PRECISION,
    "yearlyexamMarks" DOUBLE PRECISION,
    "yearlytotalMarks" DOUBLE PRECISION,
    "yearlygrade" TEXT,
    "yearlyremarks" TEXT,

    CONSTRAINT "YearlyMarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeniorMark" (
    "id" SERIAL NOT NULL,
    "pt1" DOUBLE PRECISION,
    "pt2" DOUBLE PRECISION,
    "pt3" DOUBLE PRECISION,
    "bestTwoPTAvg" DOUBLE PRECISION,
    "multipleAssessment" DOUBLE PRECISION,
    "portfolio" DOUBLE PRECISION,
    "subEnrichment" DOUBLE PRECISION,
    "bestScore" DOUBLE PRECISION,
    "finalExam" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION,
    "grade" TEXT,
    "overallTotal" DOUBLE PRECISION,
    "overallMarks" DOUBLE PRECISION,
    "overallGrade" TEXT,
    "remarks" TEXT,
    "studentId" TEXT NOT NULL,
    "sectionSubjectId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeniorMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HigherMark" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "sectionSubjectId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "unitTest1" DOUBLE PRECISION,
    "halfYearly" DOUBLE PRECISION,
    "unitTest2" DOUBLE PRECISION,
    "theory" DOUBLE PRECISION,
    "practical" DOUBLE PRECISION,
    "totalWithout" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION,
    "overallGrade" TEXT,
    "total" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "grade" TEXT,
    "remarks" TEXT,

    CONSTRAINT "HigherMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionfrom" TIMESTAMP(3) NOT NULL,
    "sessionto" TIMESTAMP(3) NOT NULL,
    "sessioncode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" SERIAL NOT NULL,
    "category" "Category" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_phone_key" ON "Teacher"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_assignedClassId_key" ON "Teacher"("assignedClassId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionno_key" ON "Student"("admissionno");

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_classId_key" ON "Section"("name", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubject_sectionId_subjectId_key" ON "SectionSubject"("sectionId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JuniorMark_studentId_classSubjectId_sessionId_key" ON "JuniorMark"("studentId", "classSubjectId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HalfYearlyMarks_juniorMarkId_key" ON "HalfYearlyMarks"("juniorMarkId");

-- CreateIndex
CREATE UNIQUE INDEX "YearlyMarks_juniorMarkId_key" ON "YearlyMarks"("juniorMarkId");

-- CreateIndex
CREATE UNIQUE INDEX "SeniorMark_studentId_sectionSubjectId_sessionId_key" ON "SeniorMark"("studentId", "sectionSubjectId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HigherMark_studentId_sectionSubjectId_sessionId_key" ON "HigherMark"("studentId", "sectionSubjectId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessioncode_key" ON "Session"("sessioncode");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_assignedClassId_fkey" FOREIGN KEY ("assignedClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubject" ADD CONSTRAINT "SectionSubject_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubject" ADD CONSTRAINT "SectionSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuniorMark" ADD CONSTRAINT "JuniorMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuniorMark" ADD CONSTRAINT "JuniorMark_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuniorMark" ADD CONSTRAINT "JuniorMark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HalfYearlyMarks" ADD CONSTRAINT "HalfYearlyMarks_juniorMarkId_fkey" FOREIGN KEY ("juniorMarkId") REFERENCES "JuniorMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearlyMarks" ADD CONSTRAINT "YearlyMarks_juniorMarkId_fkey" FOREIGN KEY ("juniorMarkId") REFERENCES "JuniorMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorMark" ADD CONSTRAINT "SeniorMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorMark" ADD CONSTRAINT "SeniorMark_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorMark" ADD CONSTRAINT "SeniorMark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HigherMark" ADD CONSTRAINT "HigherMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HigherMark" ADD CONSTRAINT "HigherMark_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HigherMark" ADD CONSTRAINT "HigherMark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
