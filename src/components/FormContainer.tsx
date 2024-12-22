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
    | "section"
    | "result";  
  type: "create" | "update" | "delete" | "print"; 
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

        if (type === "update" && id) {
          const currentClass = await prisma.class.findUnique({
            where: { id: Number(id) },
            include: {
              classSubjects: {
                include: {
                  subject: {
                    select: {
                      id: true,
                      name: true,
                      code: true
                    }
                  }
                }
              }
            }
          });

          if (currentClass) {
            const formattedClass = {
              id: currentClass.id,
              name: currentClass.name,
              capacity: currentClass.capacity,
              classNumber: currentClass.classNumber,
              subjects: currentClass.classSubjects.map(cs => cs.subject.id)
            };
            
            relatedData = {
              subjects: subjectsForClass,
              currentClass: formattedClass
            };
            data = formattedClass;
          }
        } else {
          relatedData = { subjects: subjectsForClass };
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

  if (type === "print") {
    // Fetch comprehensive data for result generation
    const studentResult = await prisma.juniorMark.findMany({
      where: {
        studentId: id as string,
        session: {
          isActive: true
        }
      },
      include: {
        student: {
          select: {
            name: true,
            admissionno: true,
            Class: {
              select: {
                name: true
              }
            },
            Section: {
              select: {
                name: true
              }
            }
          }
        },
        classSubject: {
          include: {
            subject: true
          }
        },
        session: {
          select: {
            sessioncode: true
          }
        },
        halfYearly: true,
        yearly: true
      },
      orderBy: {
        classSubject: {
          subject: {
            name: 'asc'
          }
        }
      }
    });

    if (studentResult.length > 0) {
      relatedData = {
        studentResult: {
          student: studentResult[0].student,
          marks: studentResult,
          session: studentResult[0].session
        }
      };
    }
    break;
  }

  break;

    case "result":
      if (type === "print") {
        if (id) {
          // Single student result
          const studentResult = await prisma.juniorMark.findMany({
            where: {
              studentId: id as string,
              session: {
                isActive: true
              }
            },
            include: {
              student: {
                select: {
                  name: true,
                  admissionno: true,
                  Class: {
                    select: {
                      name: true
                    }
                  },
                  Section: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              classSubject: {
                include: {
                  subject: true
                }
              },
              session: {
                select: {
                  sessioncode: true
                }
              },
              halfYearly: true, // Include the new halfYearly relation
              yearly: true     // Include the new yearly relation
            },
            orderBy: {
              classSubject: {
                subject: {
                  name: 'asc'
                }
              }
            }
          });

          if (studentResult.length > 0) {
            relatedData = {
              studentResult: {
                student: studentResult[0].student,
                marks: studentResult,
                session: studentResult[0].session
              }
            };
          }
        } else if (data?.classId && data?.sectionId) {
          // Class-wise results
          // Add logic for class-wise result generation
          const classResults = await prisma.juniorMark.findMany({
            where: {
              student: {
                classId: parseInt(data.classId),
                sectionId: parseInt(data.sectionId)
              },
              session: {
                isActive: true
              }
            },
            include: {
              // Similar include as above
            }
          });

          relatedData = {
            classResults
          };
        }
      }
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