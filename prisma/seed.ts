import { PrismaClient, 
  UserSex, 
  BloodGroup, 
  Religion, 
  Category, 
  MotherTongue, 
  FatherHusband, 
  EmployeeType,
  ExamType
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.$transaction([
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
  const admins = [
    { id: "ADM001", username: "admin1" },
    { id: "ADM002", username: "admin2" }
  ];
  await prisma.admin.createMany({ data: admins });

  // Create Sessions
  const sessions = [
    {
      sessionfrom: new Date("2024-04-01"),
      sessionto: new Date("2025-03-31"),
      sessioncode: "2024-25",
      description: "Academic Year 2024-25",
      isActive: true
    }
  ];
  const createdSessions = await Promise.all(
    sessions.map(session => prisma.session.create({ data: session }))
  );

  // Create SubCategories
  const subCategories = [
    { category: Category.SC, name: "SC-A" },
    { category: Category.OBC, name: "OBC-A" }
  ];
  const createdSubCategories = await Promise.all(
    subCategories.map(sc => prisma.subCategory.create({ data: sc }))
  );

  // Create Classes
  const classes = [
    { name: "Class 1", capacity: 30 ,classNumber:1},
    { name: "Class 2", capacity: 30 ,classNumber:2},
    { name: "Class 3", capacity: 30 ,classNumber:3},
    { name: "Class 4", capacity: 30 ,classNumber:4},
    { name: "Class 5", capacity: 30 ,classNumber:5},
    { name: "Class 6", capacity: 30 ,classNumber:6},
    { name: "Class 7", capacity: 30 ,classNumber:7},
    { name: "Class 8", capacity: 30 ,classNumber:8},
    { name: "Class 9", capacity: 40 ,classNumber:9},
    { name: "Class 10", capacity: 40 ,classNumber:10},
    { name: "Class 11", capacity: 40 ,classNumber:11},
    { name: "Class 12", capacity: 40 ,classNumber:12}
  ];
  const createdClasses = await Promise.all(
    classes.map(cls => prisma.class.create({ data: cls }))
  );

  // Create Sections
  const sections = await Promise.all(
    createdClasses.flatMap(cls => 
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
  const subjects = [
    { name: "Mathematics", code: "MATH01", description: "Mathematics" },
    { name: "Science", code: "SCI01", description: "Science" },
    { name: "English", code: "ENG01", description: "English" },
    { name: "Hindi", code: "HIN01", description: "Hindi" },
    { name: "Social Science", code: "SST01", description: "Social Science" }
  ];
  const createdSubjects = await Promise.all(
    subjects.map(sub => prisma.subject.create({ data: sub }))
  );

  // Create ClassSubjects (for classes 1-8)
  await Promise.all(
    createdClasses
      .filter(cls => cls.name === "Class 1")
      .flatMap(cls =>
        createdSubjects.map(sub =>
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
    sections
      .filter(sec => {
        const cls = createdClasses.find(c => c.id === sec.classId);
        return cls && cls.name === "Class 9";
      })
      .flatMap(sec =>
        createdSubjects.map(sub =>
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
  const teachers = [
    {
      id: "TCH001",
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
  ];
  await prisma.teacher.createMany({ data: teachers });

  // Create Students
  const students = [
    {
      id: "STD001",
      admissiondate: new Date(),
      admissionno: 1001,
      name: "Student One",
      address: "Address",
      city: "City",
      village: "Village",
      Sex: UserSex.Male,
      birthday: new Date("2010-01-01"),
      Religion: Religion.Hindu,
      tongue: MotherTongue.Hindi,
      category: Category.General,
      subcategoryId: createdSubCategories[0].id,
      mothername: "Mother Name",
      mphone: "9876543210",
      moccupation: "Housewife",
      fathername: "Father Name",
      fphone: "9876543211",
      foccupation: "Business",
      aadharcard: "123456789012",
      house: "Red House",
      bloodgroup: BloodGroup.A_plus,
      yearofpass: 2023,
      board: "CBSE",
      school: "Previous School",
      grade: "A",
      document: "TC",
      tcdate: new Date(),
      tcNo: 1001,
      classId: createdClasses[0].id,
      sectionId: sections[0].id,
      sessionId: createdSessions[0].id
    }
  ];
  const createdStudents = await Promise.all(
    students.map(student => prisma.student.create({ data: student }))
  );

  // Create Junior Marks (for classes 1-8)
  const classSubjects = await prisma.classSubject.findMany();
  const juniorMarks = [
    {
      studentId: createdStudents[0].id,
      classSubjectId: classSubjects[0].id,
      examType: ExamType.HALF_YEARLY,
      sessionId: createdSessions[0].id,
      ut1: 25,
      ut2: 23,
      ut3: 24,
      ut4: 25,
      noteBook: 5,
      subEnrichment: 5,
      examMarks: 80,
      totalMarks: 90,
      grade: "A",
      remarks: "Excellent"
    }
  ];
  await prisma.juniorMark.createMany({ data: juniorMarks });

  // Create Senior Marks (for classes 9-12)
  const sectionSubjects = await prisma.sectionSubject.findMany();
  const seniorMarks = [
    {
      studentId: createdStudents[0].id,
      sectionSubjectId: sectionSubjects[0].id,
      sessionId: createdSessions[0].id,
      pt1: 20,
      pt2: 19,
      pt3: 18,
      bestTwoPTAvg: 19.5,
      multipleAssessment: 10,
      portfolio: 5,
      subEnrichment: 5,
      bestScore: 39.5,
      finalExam: 75, grandTotal: 114.5,
      grade: "A",
      remarks: "Outstanding"
    }
  ];
  await prisma.seniorMark.createMany({ data: seniorMarks });

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