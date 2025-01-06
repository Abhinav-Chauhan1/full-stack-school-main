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