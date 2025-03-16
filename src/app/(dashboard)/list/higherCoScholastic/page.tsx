import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";

/**
 * HigherCoScholasticPage component
 * @param {Object} props
 * @param {Object} props.searchParams - URL search parameters
 */
const HigherCoScholasticPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const assignedClassStr = (sessionClaims?.metadata as { assignedClass?: string })?.assignedClass || "";
  const assignedSectionStr = (sessionClaims?.metadata as { assignedSection?: string })?.assignedSection || "";
  
  // Get the assigned class id and section id for the teacher
  let assignedClassId: number | null = null;
  let assignedSectionId: number | null = null;
  
  if (role === "teacher" && userId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { 
        assignedClassId: true,
        assignedSectionId: true
      }
    });
    assignedClassId = teacher?.assignedClassId || null;
    assignedSectionId = teacher?.assignedSectionId || null;
  }

  // Check access permission
  const hasAccess = role === "admin" || (
    role === "teacher" && 
    assignedClassId && 
    assignedSectionId
  );

  if (!hasAccess) {
    throw new Error("You don't have permission to access this page");
  }

  const { page, sessionId, classId, sectionId } = searchParams;

  const p = page ? parseInt(page) : 1;

  // Fetch all sessions, classes for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  // Filter classes based on role and assigned class
  const classes = await prisma.class.findMany({
    where: {
      AND: [
        {
          classNumber: {
            gte: 11 // Higher classes only (11-12)
          }
        },
        role === "teacher" && assignedClassId
          ? { id: assignedClassId }
          : {}
      ]
    },
    orderBy: { 
      classNumber: "asc"
    },
    include: {
      sections: {
        where: role === "teacher" && assignedSectionId
          ? { id: assignedSectionId }
          : undefined,
      }
    },
  });

  // Get selected class for section filter
  const selectedClass = classId
    ? classes.find((c) => c.id === parseInt(classId))
    : null;

  // Build query for co-scholastic data
  const query: any = {};

  // Add teacher restrictions
  if (role === "teacher") {
    if (assignedClassId) {
      query.higherMark = {
        sectionSubject: {
          section: {
            classId: assignedClassId
          }
        }
      };
    }
    if (assignedSectionId) {
      query.higherMark = {
        ...query.higherMark,
        student: {
          sectionId: assignedSectionId
        }
      };
    }
  }

  // Add other query parameters
  if (sessionId) {
    query.higherMark = {
      ...query.higherMark,
      sessionId: parseInt(sessionId)
    };
  }
  
  if (classId) {
    query.higherMark = {
      ...query.higherMark,
      sectionSubject: {
        ...query.higherMark?.sectionSubject,
        section: {
          ...query.higherMark?.sectionSubject?.section,
          classId: parseInt(classId)
        }
      }
    };
  }
  
  if (sectionId) {
    query.higherMark = {
      ...query.higherMark,
      student: {
        ...query.higherMark?.student,
        sectionId: parseInt(sectionId)
      }
    };
  }

  // Fetch co-scholastic data
  const [data, count] = await prisma.$transaction([
    prisma.higherCoScholastic.findMany({
      where: query,
      include: {
        higherMark: {
          include: {
            student: true,
            session: true,
            sectionSubject: {
              include: {
                section: {
                  include: {
                    class: true
                  }
                },
                subject: true
              }
            }
          }
        }
      },
      orderBy: [
        { higherMark: { student: { name: "asc" } } }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.higherCoScholastic.count({ where: query }),
  ]);

  // Define columns for the table
  const columns = [
    {
      header: "Student Name",
      accessor: "higherMark.student.name",
    },
    {
      header: "Admission No",
      accessor: "higherMark.student.admissionno",
    },
    {
      header: "Physical Education",
      accessor: "physicalEducation",
    },
    {
      header: "Work Experience",
      accessor: "workExperience",
    },
    {
      header: "Discipline",
      accessor: "discipline", 
    }
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Higher Co-Scholastic Activities {role === "teacher" && `- ${assignedClassStr} ${assignedSectionStr}`}
          </h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4 self-end">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/filter.png" alt="" width={14} height={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              {(role === "admin" || role === "teacher") && (
                <FormContainer table="higherCoScholastic" type="create" />
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            name="sessionId"
            label="Session"
            options={sessions.map((session: any) => ({
              value: session.id.toString(),
              label: session.sessioncode,
            }))}
          />
          {role === "admin" && (
            <>
              <Select
                name="classId"
                label="Class"
                options={classes.map((cls) => ({
                  value: cls.id.toString(),
                  label: cls.name,
                }))}
              />
              <Select
                name="sectionId"
                label="Section"
                options={
                  classId
                    ? classes
                        .find((c) => c.id === parseInt(classId))
                        ?.sections.map((section) => ({
                          value: section.id.toString(),
                          label: section.name,
                        })) ?? []
                    : []
                }
                disabled={!classId}
              />
            </>
          )}
        </div>
      </div>

      {/* Co-Scholastic List */}
      <div className="mt-6">
        <h2 className="text-md font-semibold mb-3">Students</h2>
        {sessionId && classId && sectionId ? (
          data.length > 0 ? (
            <Table
              columns={columns}
              data={data}
              renderRow={(item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
                >
                  <td className="p-4">{item.higherMark?.student?.name || '-'}</td>
                  <td className="p-4">{item.higherMark?.student?.admissionno || '-'}</td>
                  <td className="p-4">{item.physicalEducation || '-'}</td>
                  <td className="p-4">{item.workExperience || '-'}</td>
                  <td className="p-4">{item.discipline || '-'}</td>
                </tr>
              )}
            />
          ) : (
            <p>No co-scholastic data found for the selected criteria.</p>
          )
        ) : (
          <p>Please select all filters to view co-scholastic data.</p>
        )}
        {sessionId && classId && sectionId && (
          <Pagination page={p} count={count} />
        )}
      </div>
    </div>
  );
};

export default HigherCoScholasticPage;
