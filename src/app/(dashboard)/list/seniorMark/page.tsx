import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";
import RecalculateButton from "@/components/RecalculateButton"; // Add this import

const SeniorMarkListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const assignedClassStr = (sessionClaims?.metadata as { assignedClass?: string })?.assignedClass;
  
  // Extract class number from "Class X" format
  const assignedClassNum = assignedClassStr 
    ? parseInt(assignedClassStr.replace("Class ", ""))
    : undefined;

  const { page, sessionId, classId, sectionId, subjectId } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Fetch all sessions, classes, and subjects for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  // Filter classes based on role and assigned class
  const classes = await prisma.class.findMany({
    where: {
      AND: [
        { classNumber: 9 },
        role === "teacher" && assignedClassNum
          ? { classNumber: assignedClassNum }
          : {}
      ]
    },
    orderBy: { name: "asc" },
    include: {
      sections: {
        include: {
          sectionSubjects: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  // Get sections for selected class
  const selectedClass = classId
    ? classes.find((c) => c.id === parseInt(classId))
    : null;

  // Get subjects for selected section
  const selectedSection = sectionId && selectedClass
    ? selectedClass.sections.find((s) => s.id === parseInt(sectionId))
    : null;

  const subjects = selectedSection?.sectionSubjects.map((ss) => ss.subject) ?? [];

  // Build query for marks
  const query: any = {};

  if (sessionId) {
    query.sessionId = parseInt(sessionId);
  }

  if (classId && sectionId && subjectId) {
    query.AND = [
      {
        student: {
          AND: [
            { classId: parseInt(classId) },
            { sectionId: parseInt(sectionId) }
          ]
        }
      },
      {
        sectionSubject: {
          AND: [
            { sectionId: parseInt(sectionId) },
            { subjectId: parseInt(subjectId) }
          ]
        }
      }
    ];
  }

  // Fetch marks data
  const [data, count] = await prisma.$transaction([
    prisma.seniorMark.findMany({
      where: query,
      include: {
        student: true,
        sectionSubject: {
          include: {
            subject: true,
            section: true
          }
        },
        session: true
      },
      orderBy: [
        { student: { name: "asc" } },
        { sectionSubject: { subject: { name: "asc" } } }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.seniorMark.count({ where: query }),
  ]);

  // Define columns for the table
  const isVocationalIT = data.some(mark => mark.sectionSubject.subject.code === "IT001");

  const columns = isVocationalIT ? [
    { header: "Student Name", accessor: "student.name" },
    { header: "Admission No", accessor: "student.admissionno" },
    { header: "Theory (70)", accessor: "theory" },
    { header: "Practical (30)", accessor: "practical" },
    { header: "Total (100)", accessor: "total" },
    { header: "Remarks", accessor: "remarks" }
  ] : [
    { header: "Student Name", accessor: "student.name" },
    { header: "Admission No", accessor: "student.admissionno", className: "hidden md:table-cell" },
    { header: "PT1", accessor: "pt1", className: "hidden md:table-cell" },
    { header: "PT2", accessor: "pt2", className: "hidden md:table-cell" },
    { header: "PT3", accessor: "pt3", className: "hidden md:table-cell" },
    { header: "Best 2 PT Avg", accessor: "bestTwoPTAvg" },
    { header: "Multiple Assessment", accessor: "multipleAssessment", className: "hidden md:table-cell" },
    { header: "Portfolio", accessor: "portfolio", className: "hidden md:table-cell" },
    { header: "Sub Enrichment", accessor: "subEnrichment", className: "hidden md:table-cell" },
    { header: "Best Score", accessor: "bestScore" },
    { header: "Final Exam", accessor: "finalExam" },
    { header: "Grand Total", accessor: "grandTotal" },
    { header: "Grade", accessor: "grade" }
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Senior Marks List
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
                <>
                  <FormContainer table="seniorMark" type="create" />
                  <RecalculateButton type="senior" />
                </>
              )}
            </div>
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
              label: cls.name,
            }))}
          />
          <Select
            name="sectionId"
            label="Section"
            options={
              selectedClass?.sections.map((section) => ({
                value: section.id.toString(),
                label: section.name,
              })) ?? []
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
            disabled={!sectionId}
          />
        </div>
      </div>

      {/* Marks List */}
      <div className="mt-6">
        <h2 className="text-md font-semibold mb-3">Students</h2>
        {sessionId && classId && sectionId && subjectId ? (
          data.length > 0 ? (
            <Table 
              columns={columns} 
              data={data} 
              renderRow={(item) => (
                <tr 
                  key={`${item.student.id}-${item.sectionSubject.id}`}
                  className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
                >
                  <td className="p-4">{item.student.name}</td>
                  <td className="hidden md:table-cell">{item.student.admissionno}</td>
                  {item.sectionSubject.subject.code === "IT001" ? (
                    <>
                      <td>{item.theory}</td>
                      <td>{item.practical}</td>
                      <td>{item.total}</td>
                      <td>{item.remarks}</td>
                    </>
                  ) : (
                    <>
                      <td className="hidden md:table-cell">{item.pt1}</td>
                      <td className="hidden md:table-cell">{item.pt2}</td>
                      <td className="hidden md:table-cell">{item.pt3}</td>
                      <td>{item.bestTwoPTAvg}</td>
                      <td className="hidden md:table-cell">{item.multipleAssessment}</td>
                      <td className="hidden md:table-cell">{item.portfolio}</td>
                      <td className="hidden md:table-cell">{item.subEnrichment}</td>
                      <td>{item.bestScore}</td>
                      <td>{item.finalExam}</td>
                      <td>{item.grandTotal}</td>
                      <td>{item.grade}</td>
                    </>
                  )}
                </tr>
              )}
            />
          ) : (
            <p>No marks found for the selected criteria.</p>
          )
        ) : (
          <p>Please select all filters to view marks.</p>
        )}
        {sessionId && classId && sectionId && subjectId && (
          <Pagination page={p} count={count} />
        )}
      </div>
    </div>
  );
};

export default SeniorMarkListPage;
