import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Student, Class, Section, Session, Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import ClassFilterSelect from "./ClassFilterSelect";
import SectionFilterSelect from "./SectionFilterSelect";
import SessionFilterSelect from "./SessionFilterSelect";

interface StudentWithDetails extends Student {
  Class: Class | null;
  Section: Section | null;
  Session: Session | null;
}

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Get teacher's assigned class and section if role is teacher
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

  const columns = [
    {
      header: "Student Info",
      accessor: "name",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Section",
      accessor: "section",
      className: "hidden md:table-cell",
    },
    {
      header: "Contact",
      accessor: "contact",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden xl:table-cell",
    },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: StudentWithDetails) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          alt={`${item.name}'s avatar`}
          width={40}
          height={40}
          className="rounded-full object-cover"
          style={{ width: '40px', height: '40px' }}
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <span className="text-xs text-gray-500">Adm: {item.admissionno}</span>
          {item.previousClass && (
            <span className="text-xs text-gray-500">Prev: {item.previousClass}</span>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell">{item.Class?.name || "-"}</td>
      <td className="hidden md:table-cell">{item.Section?.name || "-"}</td>
      <td className="hidden lg:table-cell">
        <div className="flex flex-col">
          <span>M: {item.mphone}</span>
          <span>F: {item.fphone}</span>
        </div>
      </td>
      <td className="hidden xl:table-cell">
        <div className="flex flex-col">
          <span>{item.address}</span>
          <span className="text-xs text-gray-500">{item.city}, {item.village}</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer
                table="student"
                type="update"
                data={item}
              />
              <FormContainer
                table="student"
                type="delete"
                id={item.id}
              />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Build the query based on search parameters
  const query: Prisma.StudentWhereInput = {};
  
  // Add teacher class and section restrictions
  if (role === "teacher") {
    if (assignedClassId) {
      query.classId = assignedClassId;
    }
    if (assignedSectionId) {
      query.sectionId = assignedSectionId;
    }
  }

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: Prisma.QueryMode.insensitive } },
              { admissionno: !isNaN(parseInt(value)) ? parseInt(value) : undefined },
              { mphone: { contains: value } },
              { fphone: { contains: value } }
            ].filter(Boolean);
            break;
          case "classId":
            // Only allow admin to filter by class
            if (role === "admin") {
              query.classId = parseInt(value);
            }
            break;
          case "sectionId":
            query.sectionId = parseInt(value);
            break;
          case "sessionId":
            query.sessionId = parseInt(value);
            break;
        }
      }
    });
  }

  // Fetch students with related data
  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        Class: true,
        Section: true,
        Session: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: [
        { Class: { classNumber: 'asc' } },
        { name: 'asc' }
      ],
    }),
    prisma.student.count({ where: query }),
  ]);

  // Fetch related data for filters and forms
  const [classes, sections, sessions] = await Promise.all([
    prisma.class.findMany({
      orderBy: { classNumber: 'asc' },
      select: {
        id: true,
        name: true,
        classNumber: true,
      },
    }),
    prisma.section.findMany({
      orderBy: [
        { class: { classNumber: 'asc' } },
        { name: 'asc' },
      ],
      include: {
        class: true,
      },
    }),
    prisma.session.findMany({
      orderBy: { sessionfrom: 'desc' },
      where: {
        isActive: true,
      },
    }),
  ]);

  // Only show class/section filters for admin
  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Students List</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && (
              <>
                <ClassFilterSelect 
                  classes={classes} 
                  selectedClassId={queryParams.classId} 
                />
                <SectionFilterSelect 
                  sections={sections}
                  selectedSectionId={queryParams.sectionId}
                  selectedClassId={queryParams.classId}
                />
                <SessionFilterSelect 
                  sessions={sessions}
                  selectedSessionId={queryParams.sessionId}
                />
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                  <Image 
                    src="/sort.png" 
                    alt="Sort" 
                    width={14} 
                    height={14}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </button>
                <FormContainer
                  table="student"
                  type="create"
                  data={null}
                  relatedData={{ classes, sections, sessions }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default StudentListPage;