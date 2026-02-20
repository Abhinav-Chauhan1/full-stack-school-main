import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";

const Results9Page = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const { page, sessionId, classId, sectionId } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Fetch all sessions
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  // Only fetch class 9
  const classes = await prisma.class.findMany({
    where: {
      classNumber: 9
    },
    include: {
      sections: true,
    },
  });

  // Build query for students
  const query: any = {
    Class: {
      classNumber: 9
    }
  };

  if (classId) {
    query.classId = parseInt(classId);
  }

  if (sectionId) {
    query.sectionId = parseInt(sectionId);
  }

  if (sessionId) {
    query.sessionId = parseInt(sessionId);
  }

  // Fetch students with their marks
  const [students, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        Class: true,
        Section: true,
        Session: true,
        marksSenior: {
          include: {
            session: true,
            sectionSubject: {
              include: {
                subject: true
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Class 9 Results
          </h1>
          <div className="flex items-center gap-4">
            {classId && sectionId && (
              <FormContainer
                table="result9"
                type="print"
                data={{ classId, sectionId }}
              />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    table="result9"
                    type="print"
                    id={student.id}
                    data={{ sessionId: sessionId ? parseInt(sessionId) : undefined }}
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

export default Results9Page;
