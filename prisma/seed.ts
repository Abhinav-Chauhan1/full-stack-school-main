import { PrismaClient, 
  UserSex, 
  BloodGroup, 
  Religion, 
  Category, 
  MotherTongue, 
  FatherHusband, 
  EmployeeType
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.halfYearlyMarks.deleteMany({}),
    prisma.yearlyMarks.deleteMany({}),
    prisma.juniorMark.deleteMany({}),
    prisma.seniorMark.deleteMany({}),
    prisma.sectionSubject.deleteMany({}),
    prisma.classSubject.deleteMany({}),
    prisma.student.deleteMany({}),
    prisma.section.deleteMany({}),
    prisma.subject.deleteMany({}),
    prisma.class.deleteMany({}),
    prisma.teacher.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.subCategory.deleteMany({}),
    prisma.admin.deleteMany({})
  ]);

  // Create Admins
  const adminCreation = await prisma.admin.createMany({ 
    data: [
      { username: "admin1" },
      { username: "admin2" }
    ] 
  });

  // Create Sessions
  const session = await prisma.session.create({
    data: {
      sessionfrom: new Date("2024-04-01"),
      sessionto: new Date("2025-03-31"),
      sessioncode: "2024-25",
      description: "Academic Year 2024-25",
      isActive: true
    }
  });

  // Create SubCategories
  const subCategories = await prisma.subCategory.createMany({
    data: [
      { category: Category.SC, name: "SC-A" },
      { category: Category.OBC, name: "OBC-A" }
    ]
  });

  // Create Classes
  const classCreation = await prisma.class.createMany({
    data: [
      { name: "Class 1", capacity: 30, classNumber: 1 },
      { name: "Class 2", capacity: 30, classNumber: 2 },
      { name: "Class 3", capacity: 30, classNumber: 3 },
      { name: "Class 4", capacity: 30, classNumber: 4 },
      { name: "Class 5", capacity: 30, classNumber: 5 },
      { name: "Class 6", capacity: 30, classNumber: 6 },
      { name: "Class 7", capacity: 30, classNumber: 7 },
      { name: "Class 8", capacity: 30, classNumber: 8 },
      { name: "Class 9", capacity: 40, classNumber: 9 },
      { name: "Class 10", capacity: 40, classNumber: 10 },
      { name: "Class 11", capacity: 40, classNumber: 11 },
      { name: "Class 12", capacity: 40, classNumber: 12 }
    ]
  });

  // Fetch created classes
  const allClasses = await prisma.class.findMany();

  // Create Sections
  const sections = await Promise.all(
    allClasses.flatMap(cls => 
      ['A', 'B'].map(sectionName =>
        prisma.section.create({
          data: {
            name: sectionName,
            classId: cls.id
          }
        })
      )
    )
  );

  // Create Subjects
  const subjectCreation = await prisma.subject.createMany({
    data: [
      { name: "Mathematics", code: "MATH01", description: "Mathematics" },
      { name: "Science", code: "SCI01", description: "Science" },
      { name: "English", code: "ENG01", description: "English" },
      { name: "Hindi", code: "HIN01", description: "Hindi" },
      { name: "Social Science", code: "SST01", description: "Social Science" }
    ]
  });

  // Fetch created subjects
  const allSubjects = await prisma.subject.findMany();
  const allSections = await prisma.section.findMany();
  const allSubCategories = await prisma.subCategory.findMany();
  const allSessions = await prisma.session.findMany();

  // Create ClassSubjects (for classes 1-8)
  await Promise.all(
    allClasses
      .filter(cls => parseInt(cls.name.replace('Class ', '')) <= 8)
      .flatMap(cls =>
        allSubjects.map(sub =>
          prisma.classSubject.create({
            data: {
              classId: cls.id,
              subjectId: sub.id
            }
          })
        )
      )
  );

  // Create SectionSubjects (for classes 9-12)
  await Promise.all(
    allSections
      .filter(sec => {
        const cls = allClasses.find(c => c.id === sec.classId);
        return cls && parseInt(cls.name.replace('Class ', '')) >= 9;
      })
      .flatMap(sec =>
        allSubjects.map(sub =>
          prisma.sectionSubject.create({
            data: {
              sectionId: sec.id,
              subjectId: sub.id
            }
          })
        )
      )
  );

  // Create Teachers
  const teacher = await prisma.teacher.create({
    data: {
      name: "John Doe",
      password: "hashedpassword",
      Sex: UserSex.Male,
      FatherHusband: FatherHusband.Father,
      birthday: new Date("1980-01-01"),
      email: "john@school.com",
      phone: "1234567890",
      address: "123 Street",
      city: "City",
      state: "State",
      bloodgroup: BloodGroup.A_plus,
      joiningdate: new Date("2020-01-01"),
      designation: "Senior Teacher",
      qualification: "M.Ed",
      EmployeeType: EmployeeType.Permanent
    }
  });

  // Create Students
  const subCategoryData = await prisma.subCategory.findFirst({
    where: { category: Category.SC }
  });

  const classData = await prisma.class.findFirst({
    where: { name: "Class 1" }
  });

  const sectionData = await prisma.section.findFirst({
    where: { name: "A", classId: classData?.id }
  });

  const student = await prisma.student.create({
    data: {
      admissiondate: new Date(),
      admissionno: 1001,
      name: "Student One",
      address: "Address",
      city: "City",
      village: "Village",
      Sex: UserSex.Male,
      birthday: new Date("2010-01-01"),
      nationality: "Indian",
      Religion: Religion.Hindu,
      tongue: MotherTongue.Hindi,
      category: Category.General,
      SubCategory: subCategoryData ? { connect: { id: subCategoryData.id } } : undefined,
      mothername: "Mother Name",
      mphone: "9876543210",
      moccupation: "Housewife",
      fathername: "Father Name", 
      fphone: "9876543211",
      foccupation: "Business",
      aadharcard: "123456789012",
      house: "Red House",
      bloodgroup: BloodGroup.A_plus,
      previousClass: "Previous School",
      yearofpass: 2023,
      board: "CBSE",
      school: "Previous School",
      grade: "A",
      document: "TC",
      tc: true,
      tcdate: new Date(),
      tcNo: 1001,
      Class: classData ? { connect: { id: classData.id } } : undefined,
      Section: sectionData ? { connect: { id: sectionData.id } } : undefined,
      Session: { connect: { id: allSessions[0].id } }
    }
  });

  // Fetch ClassSubjects and SectionSubjects
  const classSubjects = await prisma.classSubject.findMany();
  const sectionSubjects = await prisma.sectionSubject.findMany();

  // Create Junior Marks (for classes 1-8)
  const juniorMark = await prisma.juniorMark.create({
    data: {
      studentId: student.id,
      classSubjectId: classSubjects[0].id,
      sessionId: allSessions[0].id,
      halfYearly: {
        create: {
          ut1: 25,
          ut2: 23,
          noteBook: 5,
          subEnrichment: 5,
          examMarks: 80,
          totalMarks: 90,
          grade: "A",
          remarks: "Excellent"
        }
      },
      yearly: {
        create: {
          ut3: 24,
          ut4: 25,
          yearlynoteBook: 5,
          yearlysubEnrichment: 5,
          yearlyexamMarks: 80,
          yearlytotalMarks: 90,
          yearlygrade: "A",
          yearlyremarks: "Excellent"
        }
      },
      grandTotalMarks: 90,
      grandTotalGrade: "A",
      overallPercentage: 90
    }
  });

  // Create Senior Marks (for classes 9-12)
  await prisma.seniorMark.create({
    data: {
      studentId: student.id,
      sectionSubjectId: sectionSubjects[0].id,
      sessionId: allSessions[0].id,
      pt1: 20,
      pt2: 19,
      pt3: 18,
      bestTwoPTAvg: 19.5,
      multipleAssessment: 10,
      portfolio: 5,
      subEnrichment: 5,
      bestScore: 39.5,
      finalExam: 75,
      grandTotal: 114.5,
      grade: "A",
      remarks: "Outstanding"
    }
  });

  console.log("Database seeding completed successfully!");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });