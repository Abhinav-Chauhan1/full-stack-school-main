import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";
import Image from "next/image";

const ResultsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const assignedClassStr = (sessionClaims?.metadata as { assignedClass?: string })?.assignedClass || "";
  
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
  
  // Change this check to use assignedClassId
  const hasAccess = role === "admin" || (
    role === "teacher" && 
    assignedClassId !== null && 
    (typeof assignedClassId === "number" ? assignedClassId <= 8 : true)
  );

  if (!hasAccess) {
    throw new Error("You don't have permission to access this page");
  }

  const { page, sessionId, classId, sectionId, examType } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Fetch all sessions and classes for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  // Filter classes based on role and assigned class
  const classes = await prisma.class.findMany({
    where: {
      AND: [
        {
          classNumber: {
            lte: 8
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
      },
    },
  });

  // Build query for students
  const query: any = {};

  if (classId) {
    query.classId = parseInt(classId);
  }

  if (sectionId) {
    query.sectionId = parseInt(sectionId);
  }

  // Update the students query to include all necessary relations
  const [students, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        Class: true,
        Section: true,
        Session: true,
        marksJunior: {
          include: {
            session: true,
            halfYearly: true,
            yearly: true,
            coScholastic: true, // Make sure to include co-scholastic data
            classSubject: {
              include: {
                subject: {
                  select: {
                    name: true,
                    code: true
                  }
                }
              }
            }
          },
          where: sessionId ? {
            sessionId: parseInt(sessionId)
          } : undefined
        }
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: query }),
  ]);

  const columns = [
    {
      header: "Student Name",
      accessor: "name",
    },
    {
      header: "Admission No",
      accessor: "admissionno",
    },
    {
      header: "Class",
      accessor: "Class.name",
    },
    {
      header: "Section",
      accessor: "Section.name",
    },
    {
      header: "Actions",
      accessor: "actions",
    },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Student Results
          </h1>
          <div className="flex items-center gap-4">
            {classId && sectionId && (
              <FormContainer
                table="result"
                type="print"
                data={{ classId, sectionId }}
              />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            name="sessionId"
            label="Session"
            options={sessions.map((session) => ({
              value: session.id.toString(),
              label: session.sessioncode,
            }))}
          />
          <Select
            name="classId"
            label="Class"
            options={classes.map((cls) => ({
              value: cls.id.toString(),
              label: cls.name, // Use direct name like in juniorMark page
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
        </div>
      </div>

      {/* Students List */}
      <div className="mt-6">
        <Table
          columns={columns}
          data={students}
          renderRow={(student) => (
            <tr
              key={student.id}
              className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
            >
              <td className="p-4">{student.name}</td>
              <td>{student.admissionno}</td>
              <td>{student.Class.name}</td>
              <td>{student.Section.name}</td>
              <td>
                <div className="flex items-center gap-2">
                  <FormContainer
                    table="result"
                    type="print"
                    id={student.id}
                  />
                </div>
              </td>
            </tr>
          )}
        />
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default ResultsPage;