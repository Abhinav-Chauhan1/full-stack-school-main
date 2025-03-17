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
    | "section"
    | "subCategory"
    | "juniorMark"
    | "session"
    | "seniorMark"
    | "higherMark"  // Add this new type
    | "juniorCoScholastic"  // Add this new type
    | "seniorCoScholastic"  // Add Senior Co-Scholastic type
    | "higherCoScholastic"  // Add this new type
    | "result"
    | "result9"  // Add this new type
    | "result11";  // Add this new type
  type: "create" | "update" | "delete" | "print"; 
  data?: any;
  id?: number | string;
  relatedData?: {
    classes?: any[];
    sections?: any[];
    sessions?: any[];
    subjects?: any[];
    currentClass?: any;
    currentSection?: any;
    currentStudent?: any;
    existingMarks?: any[];
    studentResult?: any;
  };
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUser = userId;

  if (type !== "delete") {
    switch (table) {
      case "teacher":
        // Add this new case to fetch all classes for teacher form
        const teacherClasses = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            classNumber: true
          },
          orderBy: {
            classNumber: 'asc'
          }
        });

        if (type === "update" && id) {
          const currentTeacher = await prisma.teacher.findUnique({
            where: { id: id as string },
            include: {
              assignedClass: true
            }
          });

          relatedData = {
            classes: teacherClasses,
            currentTeacher
          };
          data = currentTeacher;
        } else {
          relatedData = { classes: teacherClasses };
        }
        break;

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
  // Get classes with sections, students count, and capacity
  const studentClasses = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
      classNumber: true,
      _count: { 
        select: { students: true } 
      },
      sections: {
        select: {
          id: true,
          name: true,
          classId: true
        },
        orderBy: {
          name: 'asc'
        }
      }
    },
    orderBy: {
      classNumber: 'asc'
    }
  });

  // Get active sessions only
  const studentSessions = await prisma.session.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      sessioncode: true
    },
    orderBy: {
      sessionfrom: 'desc'
    }
  });

  // If updating, get current student data
  if (type === "update" && id) {
    const currentStudent = await prisma.student.findUnique({
      where: { id: id as string },
      include: {
        Class: true,
        Section: true,
        Session: true
      }
    });

    if (currentStudent) {
      relatedData = {
        classes: studentClasses,
        sessions: studentSessions,
        currentStudent
      };
      data = currentStudent;
    }
  } else {
    relatedData = {
      classes: studentClasses,
      sessions: studentSessions
    };
  }
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
    userRole: role,
    assignedClass: ((sessionClaims?.metadata as { assignedClass?: string })?.assignedClass) || ""
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
          // Single student result with complete data
          const studentData = await prisma.student.findUnique({
            where: { id: id as string },
            include: {
              Class: true,
              Section: true,
              Session: true,
              marksJunior: {
                include: {
                  classSubject: {
                    include: {
                      subject: true
                    }
                  },
                  halfYearly: true,
                  yearly: true,
                  coScholastic: true,  // Add this line to fetch co-scholastic data
                  session: {
                    select: {
                      sessioncode: true,
                      sessionfrom: true,
                      sessionto: true
                    }
                  }
                },
                where: {
                  session: {
                    isActive: true
                  }
                }
              }
            }
          });

          if (studentData) {
            relatedData = {
              studentResult: {
                student: studentData,
                marksJunior: studentData.marksJunior,
                session: studentData.Session
              }
            };
          }
        } else if (data?.classId && data?.sectionId) {
          // Bulk print for entire section
          const studentsData = await prisma.student.findMany({
            where: {
              classId: parseInt(data.classId),
              sectionId: parseInt(data.sectionId),
              Session: {
                isActive: true
              }
            },
            include: {
              Class: true,
              Section: true,
              Session: true,
              marksJunior: {
                include: {
                  classSubject: {
                    include: {
                      subject: true
                    }
                  },
                  halfYearly: true,
                  yearly: true,
                  coScholastic: true,  // Add this line to fetch co-scholastic data
                  session: {
                    select: {
                      sessioncode: true,
                      sessionfrom: true,
                      sessionto: true
                    }
                  }
                },
                where: {
                  session: {
                    isActive: true
                  }
                }
              }
            }
          });

          relatedData = {
            studentsResults: studentsData.map(student => ({
              student,
              marksJunior: student.marksJunior,
              session: student.Session
            }))
          };
        }
      }
      break;

      case "result9":
  if (type === "print") {
    if (id) {
      const studentData = await prisma.student.findUnique({
        where: { id: id as string },
        include: {
          Class: true,
          Section: true,
          Session: true,
          marksSenior: {
            include: {
              sectionSubject: {
                include: {
                  subject: true
                }
              },
              session: true,
              coScholastic: true // Added this to include co-scholastic data
            },
            where: {
              session: {
                isActive: true
              }
            },
            orderBy: {
              sectionSubject: {
                subject: {
                  name: 'asc'
                }
              }
            }
          }
        }
      });

      if (studentData) {
        relatedData = {
          studentResult: {
            student: {
              ...studentData,
              Class: studentData.Class,
              Section: studentData.Section
            },
            marksSenior: studentData.marksSenior,
            session: studentData.Session
          }
        };
      }
    } else if (data?.classId && data?.sectionId) {
      const studentsData = await prisma.student.findMany({
        where: {
          classId: parseInt(data.classId),
          sectionId: parseInt(data.sectionId),
          Session: {
            isActive: true
          }
        },
        include: {
          Class: true,
          Section: true,
          Session: true,
          marksSenior: {
            include: {
              sectionSubject: {
                include: {
                  subject: true
                }
              },
              session: true,
              coScholastic: true // Added this to include co-scholastic data
            },
            where: {
              session: {
                isActive: true
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      relatedData = {
        studentsResults: studentsData.map(student => ({
          student: {
            ...student,
            Class: student.Class,
            Section: student.Section
          },
          marksSenior: student.marksSenior,
          session: student.Session
        }))
      };
    }
  }
  break;

      case "result11":
        if (type === "print" && id) {
          const studentData = await prisma.student.findUnique({
            where: { id: id as string },
            include: {
              Class: true,
              Section: true,
              Session: true,
              markHigher: { // Note: This should be marksHigher to match the interface
                include: {
                  sectionSubject: {
                    include: {
                      subject: true
                    }
                  },
                  session: true,
                  coScholastic: true // Added this to include co-scholastic data
                },
                where: {
                  session: {
                    isActive: true
                  }
                },
                orderBy: {
                  sectionSubject: {
                    subject: {
                      name: 'asc'
                    }
                  }
                }
              }
            }
          });

          if (studentData) {
            relatedData = {
              studentResult: {
                student: studentData,
                marksHigher: studentData.markHigher.map(mark => ({
                  id: mark.id,
                  unitTest1: mark.unitTest1,
                  halfYearly: mark.halfYearly,
                  unitTest2: mark.unitTest2,
                  theory: mark.theory,
                  practical: mark.practical,
                  theory30: mark.theory30,       // Add this line
                  practical70: mark.practical70, // Add this line
                  totalWithout: mark.totalWithout,
                  grandTotal: mark.grandTotal,
                  sectionSubject: mark.sectionSubject,
                  coScholastic: mark.coScholastic
                })),
                session: studentData.Session
              }
            };
          }
        }
        break;

      case "seniorMark":
    const classes4SeniorMark = await prisma.class.findMany({
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
                admissionno: true,
              },
              orderBy: {
                name: 'asc',
              },
            },
            sectionSubjects: {
              select: {
                id: true,
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,  // Add this field
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        classNumber: 'asc',
      },
    });

    const sessions4senior = await prisma.session.findMany({
      select: {
        id: true,
        sessioncode: true,
        isActive: true,
      },
      orderBy: {
        sessioncode: 'asc',
      },
    });

    let existingSeniorMarks = null;
    if (type === "update" && id) {
      existingSeniorMarks = await prisma.seniorMark.findMany({
        where: {
          sectionSubjectId: Number(id),
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
      classes: classes4SeniorMark,
      sessions: sessions4senior,
      existingMarks: existingSeniorMarks || [],
    };
    break;

      case "higherMark":
        const classes4HigherMark = await prisma.class.findMany({
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
                    admissionno: true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                },
                sectionSubjects: {
                  select: {
                    id: true,
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
            },
          },
          where: {
            classNumber: {
              in: [11, 12] // Only fetch classes 11 and 12
            }
          },
          orderBy: {
            classNumber: 'asc',
          },
        });

        const sessions4higher = await prisma.session.findMany({
          select: {
            id: true,
            sessioncode: true,
            isActive: true,
          },
          orderBy: {
            sessioncode: 'asc',
          },
        });

        let existingHigherMarks = null;
        if (type === "update" && id) {
          existingHigherMarks = await prisma.higherMark.findMany({
            where: {
              sectionSubjectId: Number(id),
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
          classes: classes4HigherMark,
          sessions: sessions4higher,
          existingMarks: existingHigherMarks || [],
        };
        break;

      case "juniorCoScholastic":
        // Fetch classes with sections and students
        const classesForCoScholastic = await prisma.class.findMany({
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
                    admissionno: true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            },
          },
          where: {
            classNumber: {
              lte: 8 // Junior co-scholastic applies to classes up to 8th
            }
          },
          orderBy: {
            classNumber: 'asc',
          },
        });

        // Fetch active sessions
        const sessionsForCoScholastic = await prisma.session.findMany({
          where: {
            isActive: true
          },
          select: {
            id: true,
            sessioncode: true,
            isActive: true,
          },
          orderBy: {
            sessioncode: 'asc',
          },
        });

        relatedData = {
          classes: classesForCoScholastic,
          sessions: sessionsForCoScholastic,
        };
        break;

      case "seniorCoScholastic":
        // Fetch classes with sections and students for senior classes only (9-10)
        const classesForSeniorCoScholastic = await prisma.class.findMany({
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
                    admissionno: true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            },
          },
          where: {
            classNumber: {
              gte: 9,
              lte: 10 // Senior co-scholastic applies to classes 9-10
            }
          },
          orderBy: {
            classNumber: 'asc',
          },
        });

        // Fetch active sessions
        const sessionsForSeniorCoScholastic = await prisma.session.findMany({
          where: {
            isActive: true
          },
          select: {
            id: true,
            sessioncode: true,
            isActive: true,
          },
          orderBy: {
            sessioncode: 'asc',
          },
        });

        relatedData = {
          classes: classesForSeniorCoScholastic,
          sessions: sessionsForSeniorCoScholastic,
        };
        break;

      case "higherCoScholastic":
        // Fetch classes with sections and students for higher classes only (11-12)
        const classesForHigherCoScholastic = await prisma.class.findMany({
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
                    admissionno: true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            },
          },
          where: {
            classNumber: {
              gte: 11 // Higher co-scholastic applies to classes 11-12
            }
          },
          orderBy: {
            classNumber: 'asc',
          },
        });

        // Fetch active sessions
        const sessionsForHigherCoScholastic = await prisma.session.findMany({
          where: {
            isActive: true
          },
          select: {
            id: true,
            sessioncode: true,
            isActive: true,
          },
          orderBy: {
            sessioncode: 'asc',
          },
        });

        relatedData = {
          classes: classesForHigherCoScholastic,
          sessions: sessionsForHigherCoScholastic,
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