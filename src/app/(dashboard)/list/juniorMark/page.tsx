import { useState } from "react";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Select from "@/components/Select";
import { role } from "@/lib/data";
import { JuniorMark } from "@prisma/client";

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
  const role = sessionClaims?.metadata?.role;

  const { 
    page, 
    sessionId, 
    classId, 
    sectionId, 
    subjectId,
    examType, 
    ...queryParams 
  } = searchParams;
  
  const p = page ? parseInt(page) : 1;

  // Fetch all sessions, classes, and subjects for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: 'desc' }
  });

  

  const classes = await prisma.class.findMany({
    orderBy: { name: 'asc' },
    include: { 
      sections: true,
      classSubjects: {
        include: {
          subject: true
        }
      }
    }
  });

  // Get subjects for selected class
  const selectedClass = classId ? 
    classes.find(c => c.id === parseInt(classId)) : null;
  
  const subjects = selectedClass?.classSubjects.map(cs => cs.subject) ?? [];

  // Get students based on selected filters
  let students = [];
  if (classId && sectionId) {
    students = await prisma.student.findMany({
      where: {
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
      },
      orderBy: { name: 'asc' }
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
      header: "UT1",
      accessor: "ut1",
      className: "hidden md:table-cell",
    },
    {
      header: "UT2",
      accessor: "ut2",
      className: "hidden md:table-cell",
    },
    {
      header: "UT3",
      accessor: "ut3",
      className: "hidden md:table-cell",
    },
    {
      header: "UT4",
      accessor: "ut4",
      className: "hidden md:table-cell",
    },
    {
      header: "Notebook",
      accessor: "noteBook",
      className: "hidden md:table-cell",
    },
    {
      header: "Sub Enrichment",
      accessor: "subEnrichment",
      className: "hidden md:table-cell",
    },
    {
      header: "Exam Marks",
      accessor: "examMarks",
      className: "hidden md:table-cell",
    },
    {
      header: "Total Marks",
      accessor: "totalMarks",
    },
    {
      header: "Grade",
      accessor: "grade",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  // Build query for marks
  const query = {};

  if (queryParams.search) {
    query.student = {
      name: { contains: queryParams.search, mode: "insensitive" }
    };
  }

  if (sessionId) {
    query.sessionId = parseInt(sessionId);
  }

  if (examType) {
    query.examType = examType;
  }

  if (classId) {
    query.classSubject = {
      classId: parseInt(classId)
    };
  }

  if (subjectId) {
    query.classSubject = {
      ...query.classSubject,
      subjectId: parseInt(subjectId)
    };
  }

  if (classId && sectionId) {
    query.student = {
      ...query.student,
      AND: [
        { classId: parseInt(classId) },
        { sectionId: parseInt(sectionId) }
      ]
    };
  }
  

  // Fetch marks data
  const [data, count] = await prisma.$transaction([
    prisma.juniorMark.findMany({
      where: query,
      include: {
        student: true,
        classSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        session: true,
      },
      orderBy: [
        { student: { name: 'asc' } },
        { classSubject: { subject: { name: 'asc' } } }
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
          <h1 className="hidden md:block text-lg font-semibold">Junior Marks List</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch />
            <div className="flex items-center gap-4 self-end">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/filter.png" alt="" width={14} height={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/sort.png" alt="" width={14} height={14} />
              </button>
              {role === "admin" && <FormContainer table="juniorMark" type="create" />}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select
            name="sessionId"
            label="Session"
            options={sessions.map(session => ({
              value: session.id.toString(),
              label: session.sessioncode
            }))}
          />
          <Select
            name="classId"
            label="Class"
            options={classes.map(cls => ({
              value: cls.id.toString(),
              label: cls.name
            }))}
          />
          <Select
            name="sectionId"
            label="Section"
            options={classId ? 
              classes.find(c => c.id === parseInt(classId))?.sections.map(section => ({
                value: section.id.toString(),
                label: section.name
              })) ?? []
              : []
            }
            disabled={!classId}
          />
          <Select
            name="subjectId"
            label="Subject"
            options={subjects.map(subject => ({
              value: subject.id.toString(),
              label: subject.name
            }))}
            disabled={!classId}
          />
          <Select
            name="examType"
            label="Exam Type"
            options={[
              { value: 'HALF_YEARLY', label: 'Half Yearly' },
              { value: 'YEARLY', label: 'Yearly' }
            ]}
          />
        </div>

        
      </div>

      {/* Marks List */}
      <div className="mt-6">
  <h2 className="text-md font-semibold mb-3">Students</h2>
  {data.length > 0 ? (
    <Table columns={columns} renderRow={renderRow} data={data} />
  ) : (
    <p>No marks found for the selected criteria.</p>
  )}
  <Pagination page={p} count={count} />
</div>

    </div>
  );
};

const renderRow = (item) => (
  <tr
    key={item.student.id} // Change this line
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="p-4">{item.student.name}</td>
    <td className="hidden md:table-cell">{item.student.admissionno}</td>
    <td className="hidden md:table-cell">{item.ut1}</td>
    <td className="hidden md:table-cell">{item.ut2}</td>
    <td className="hidden md:table-cell">{item.ut3}</td>
    <td className="hidden md:table-cell">{item.ut4}</td>
    <td className="hidden md:table-cell">{item.noteBook}</td>
    <td className="hidden md:table-cell">{item.subEnrichment}</td>
    <td className="hidden md:table-cell">{item.examMarks}</td>
    <td>{item.totalMarks}</td>
    <td>{item.grade}</td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="juniorMark" type="update" data={item} />
            <FormContainer table="juniorMark" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

export default JuniorMarkListPage;