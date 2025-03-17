import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";
import RecalculateButton from "@/components/RecalculateButton";

const HigherMarkListPage = async ({
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

  const classes = await prisma.class.findMany({
    where: {
      AND: [
        { classNumber: { gte: 11 } }, // Classes 11 and above
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

  // Get sections and subjects similar to SeniorMarkListPage
  const selectedClass = classId
    ? classes.find((c) => c.id === parseInt(classId))
    : null;

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
    prisma.higherMark.findMany({
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
    prisma.higherMark.count({ where: query }),
  ]);

  // Define columns for the table based on HigherMark schema
  const getColumns = () => {
    // If a subject is selected and that subject is PAI02, show specific columns
    if (subjectId) {
      const subject = selectedSection?.sectionSubjects.find(ss => 
        ss.subject.id === parseInt(subjectId))?.subject;
        
      if (subject?.code === 'PAI02') {
        return [
          { header: "Student Name", accessor: "student.name" },
          { header: "Admission No", accessor: "student.admissionno", className: "hidden md:table-cell" },
          { header: "Theory (30)", accessor: "theory30" },
          { header: "Practical (70)", accessor: "practical70" },
          { header: "Total", accessor: "grandTotal" },
          { header: "Percentage", accessor: "percentage" },
          { header: "Grade", accessor: "grade" }
        ];
      }
    }
    
    // Default columns for regular subjects
    return [
      { header: "Student Name", accessor: "student.name" },
      { header: "Admission No", accessor: "student.admissionno", className: "hidden md:table-cell" },
      { header: "Unit Test 1", accessor: "unitTest1", className: "hidden md:table-cell" },
      { header: "Half Yearly", accessor: "halfYearly", className: "hidden md:table-cell" },
      { header: "Unit Test 2", accessor: "unitTest2", className: "hidden md:table-cell" },
      { header: "Theory", accessor: "theory" },
      { header: "Practical", accessor: "practical" },
      { header: "Total Without", accessor: "totalWithout" },
      { header: "Grand Total", accessor: "grandTotal" },
      { header: "Total", accessor: "total" },
      { header: "Percentage", accessor: "percentage" },
      { header: "Grade", accessor: "grade" }
    ];
  };
  
  const columns = getColumns();
  
  // Check if current subject is PAI02
  const isPaintingSubject = selectedSection?.sectionSubjects.find(ss => 
    ss.subject.id === parseInt(subjectId || '0'))?.subject.code === 'PAI02';

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            Higher Marks List
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
                  <FormContainer table="higherMark" type="create" />
                  <RecalculateButton type="higher" />
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
                  
                  {isPaintingSubject ? (
                    <>
                      <td>{item.theory30}</td>
                      <td>{item.practical70}</td>
                      <td>{item.grandTotal}</td>
                      <td>{item.percentage}</td>
                      <td>{item.grade}</td>
                    </>
                  ) : (
                    <>
                      <td className="hidden md:table-cell">{item.unitTest1}</td>
                      <td className="hidden md:table-cell">{item.halfYearly}</td>
                      <td className="hidden md:table-cell">{item.unitTest2}</td>
                      <td>{item.theory}</td>
                      <td>{item.practical}</td>
                      <td>{item.totalWithout}</td>
                      <td>{item.grandTotal}</td>
                      <td>{item.total}</td>
                      <td>{item.percentage}</td>
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

export default HigherMarkListPage;
