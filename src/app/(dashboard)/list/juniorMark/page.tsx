import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";

/**
 * JuniorMarkList page component
 * @param {Object} props
 * @param {Object} props.searchParams - URL search parameters
 */
const JuniorMarkListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const { page, sessionId, classId, sectionId, subjectId, examType } =
    searchParams;

  const p = page ? parseInt(page) : 1;

  // Fetch all sessions, classes, and subjects for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    include: {
      sections: true,
      classSubjects: {
        include: {
          subject: true,
        },
      },
    },
  });

  // Get subjects for selected class
  const selectedClass = classId
    ? classes.find((c) => c.id === parseInt(classId))
    : null;

  const subjects = selectedClass?.classSubjects.map((cs) => cs.subject) ?? [];

  // Get students based on selected filters
  let students = [];
  if (classId && sectionId) {
    students = await prisma.student.findMany({
      where: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
      },
      orderBy: { name: "asc" },
    });
  }

  const columns = [
    {
      header: "Student Name",
      accessor: "student.name",
    },
    {
      header: "Admission No",
      accessor: "student.admissionno",
      className: "hidden md:table-cell",
    },
    {
      header: examType === "HALF_YEARLY" ? "UT1" : "UT3",
      accessor: examType === "HALF_YEARLY" ? "halfYearly.ut1" : "yearly.ut3",
      className: "hidden md:table-cell",
    },
    {
      header: examType === "HALF_YEARLY" ? "UT2" : "UT4",
      accessor: examType === "HALF_YEARLY" ? "halfYearly.ut2" : "yearly.ut4",
      className: "hidden md:table-cell",
    },
    {
      header: "Notebook",
      accessor:
        examType === "HALF_YEARLY"
          ? "halfYearly.noteBook"
          : "yearly.yearlynoteBook",
      className: "hidden md:table-cell",
    },
    {
      header: "Sub Enrichment",
      accessor:
        examType === "HALF_YEARLY"
          ? "halfYearly.subEnrichment"
          : "yearly.yearlysubEnrichment",
      className: "hidden md:table-cell",
    },
    {
      header: "Exam Marks",
      accessor:
        examType === "HALF_YEARLY"
          ? "halfYearly.examMarks"
          : "yearly.yearlyexamMarks",
      className: "hidden md:table-cell",
    },
    {
      header: "Total Marks",
      accessor:
        examType === "HALF_YEARLY"
          ? "halfYearly.totalMarks"
          : "yearly.yearlytotalMarks",
    },
    {
      header: "Grade",
      accessor:
        examType === "HALF_YEARLY" ? "halfYearly.grade" : "yearly.yearlygrade",
    },
  ];

  // Build query for marks
  const query: any = {};

  if (sessionId) {
    query.sessionId = parseInt(sessionId);
  }

  // Determine which marks model to include based on exam type
  const includeOptions: any = {
    student: true,
    classSubject: {
      include: {
        subject: true,
        class: true,
      },
    },
    session: true,
  };

  if (examType === "HALF_YEARLY") {
    includeOptions.halfYearly = true;
  } else if (examType === "YEARLY") {
    includeOptions.yearly = true;
  }

  if (classId) {
    query.classSubject = {
      classId: parseInt(classId),
    };
  }

  if (subjectId) {
    query.classSubject = {
      ...query.classSubject,
      subjectId: parseInt(subjectId),
    };
  }

  if (classId && sectionId) {
    query.student = {
      AND: [{ classId: parseInt(classId) }, { sectionId: parseInt(sectionId) }],
    };
  }

  // Fetch marks data
  const [data, count] = await prisma.$transaction([
    prisma.juniorMark.findMany({
      where: query,
      include: includeOptions,
      orderBy: [
        { student: { name: "asc" } },
        { classSubject: { subject: { name: "asc" } } },
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.juniorMark.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Junior Marks List
          </h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4 self-end">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/filter.png" alt="" width={14} height={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              {role === "admin" && (
                <FormContainer table="juniorMark" type="create" />
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <Select
            name="subjectId"
            label="Subject"
            options={subjects.map((subject) => ({
              value: subject.id.toString(),
              label: subject.name,
            }))}
            disabled={!classId}
          />
          <Select
            name="examType"
            label="Exam Type"
            options={[
              { value: "HALF_YEARLY", label: "Half Yearly" },
              { value: "YEARLY", label: "Yearly" },
            ]}
          />
        </div>
      </div>

      {/* Marks List */}
      <div className="mt-6">
        <h2 className="text-md font-semibold mb-3">Students</h2>
        {data.length > 0 ? (
          <Table
            columns={columns}
            renderRow={(item) => renderRow(item, examType)}
            data={data}
          />
        ) : (
          <p>No marks found for the selected criteria.</p>
        )}
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

const renderRow = (item: any, examType?: string) => {
  // Determine which marks to use based on exam type
  const marks = examType === "HALF_YEARLY" ? item.halfYearly : item.yearly;

  return (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">{item.student.name}</td>
      <td className="hidden md:table-cell">{item.student.admissionno}</td>
      <td className="hidden md:table-cell">
        {examType === "HALF_YEARLY" ? marks?.ut1 : marks?.ut3 ?? "-"}
      </td>
      <td className="hidden md:table-cell">
        {examType === "HALF_YEARLY" ? marks?.ut2 : marks?.ut4 ?? "-"}
      </td>
      <td className="hidden md:table-cell">
        {examType === "HALF_YEARLY"
          ? marks?.noteBook
          : marks?.yearlynoteBook ?? "-"}
      </td>
      <td className="hidden md:table-cell">
        {examType === "HALF_YEARLY"
          ? marks?.subEnrichment
          : marks?.yearlysubEnrichment ?? "-"}
      </td>
      <td className="hidden md:table-cell">
        {examType === "HALF_YEARLY"
          ? marks?.examMarks
          : marks?.yearlyexamMarks ?? "-"}
      </td>
      <td>
        {examType === "HALF_YEARLY"
          ? marks?.totalMarks
          : marks?.yearlytotalMarks ?? "-"}
      </td>
      <td>
        {examType === "HALF_YEARLY" ? marks?.grade : marks?.yearlygrade ?? "-"}
      </td>
    </tr>
  );
};

export default JuniorMarkListPage;
