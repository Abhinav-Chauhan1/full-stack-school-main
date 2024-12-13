import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "subject"
    | "class"
    | "exam"
    | "subCategory"
    | "juniorMark"
    | "session"
    | "section";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUser = userId;

  if (type !== "delete") {
    switch (table) {
       

      case "class":
        // Fetch subjects for assigning them to specific classes
        const subjectsForClass = await prisma.subject.findMany({
          select: { 
            id: true, 
            name: true,
            code: true 
          },
          orderBy: {
            name: 'asc'
          }
        });

        relatedData = { subjects: subjectsForClass };

        // If updating, fetch current class data with its subjects
        if (type === "update" && id) {
          const currentClass = await prisma.class.findUnique({
            where: { id: Number(id) },
            include: {
              classSubjects: {
                include: {
                  subject: true
                }
              }
            }
          });

          if (currentClass) {
            relatedData = {
              ...relatedData,
              currentClass: {
                ...currentClass,
                subjects: currentClass.classSubjects.map(cs => cs.subject.id)
              }
            };
          }
        }
        break;

        case "student":
          // Fetch classes, sections, and sessions for assigning students
          const studentClasses = await prisma.class.findMany({
            include: { 
              _count: { select: { students: true } },
              sections: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              classNumber: 'asc'
            }
          });
          
          const sessions = await prisma.session.findMany({
            select: { 
              id: true, 
              sessioncode: true,
              sessionfrom: true,
              sessionto: true,
              isActive: true
            },
            orderBy: {
              sessionfrom: 'desc'
            }
          });
        
          // Fetch subcategories for the category dropdown
          const subcategories = await prisma.subCategory.findMany({
            select: {
              id: true,
              name: true,
              category: true
            },
            orderBy: {
              category: 'asc'
            }
          });
        
          // If updating, fetch current student data with all relations
          if (type === "update" && id) {
            const currentStudent = await prisma.student.findUnique({
              where: { id: id as string },
              include: {
                Class: true,
                Section: true,
                Session: true,
                SubCategory: true
              }
            });
        
            if (currentStudent) {
              relatedData = {
                ...relatedData,
                currentStudent
              };
            }
          }
        
          relatedData = { 
            classes: studentClasses,
            sessions,
            subcategories,
            sections: studentClasses.flatMap(c => c.sections)
          };
          break;

      case "section":
        // Fetch classes for assigning to sections
        const classes = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            classNumber: true,
            capacity: true,
          },
          orderBy: {
            classNumber: 'asc',
          }
        });

        // Fetch all subjects
        const allSubjects = await prisma.subject.findMany({
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        });

        relatedData = { classes, subjects: allSubjects };

        // If updating, fetch current section data
        if (type === "update" && id) {
          const currentSection = await prisma.section.findUnique({
            where: { id: Number(id) },
            include: {
              class: true,
              sectionSubjects: {
                include: {
                  subject: true
                }
              }
            }
          });

          if (currentSection) {
            relatedData = {
              ...relatedData,
              currentSection: {
                ...currentSection,
                subjects: currentSection.sectionSubjects.map(ss => ss.subject.id)
              }
            };
          }
        }
        break;

        case "juniorMark":
  // Fetch comprehensive data for junior mark form
  const classes4JuniorMark = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      classNumber: true,
      sections: {
        select: {
          id: true,
          name: true,
          students: {
            select: {
              id: true,
              name: true,
              admissionno: true, // Include admission number
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      },
      classSubjects: {
        select: {
          id: true, // MISSING: Need to include ClassSubject ID
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: {
      classNumber: 'asc',
    },
  });

  // Fetch available sessions
  const sessions4junior = await prisma.session.findMany({
    select: {
      id: true,
      sessioncode: true,
      isActive: true,
    },
    orderBy: {
      sessioncode: 'asc',
    },
  });

  // If updating, fetch existing marks for pre-filling the form
  let existingMarks = null;
  if (type === "update" && id) {
    existingMarks = await prisma.juniorMark.findMany({
      where: {
        classSubjectId: Number(id),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionno: true,
          },
        },
      },
    });
  }

  relatedData = {
    classes: classes4JuniorMark,
    sessions: sessions4junior,
    existingMarks: existingMarks || [],
  };
  break;

        

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;