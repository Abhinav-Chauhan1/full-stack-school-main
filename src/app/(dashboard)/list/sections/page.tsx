import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Prisma, Section, Class, Subject, SectionSubject } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import SectionFilterSelect from "@/components/SectionFilterSelect";

interface SectionWithDetails extends Section {
  class: Class;
  sectionSubjects: (SectionSubject & {
    subject: Subject;
  })[];
}

const SectionListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    { header: "Section Name", accessor: "name" },
    { header: "Class", accessor: "class.name", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: SectionWithDetails) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.class.name}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer 
              table="section" 
              type="update" 
              data={{
                ...item,
                classId: item.class.id,
                subjects: item.sectionSubjects.map(ss => ss.subject.id)
              }} 
            />
            <FormContainer table="section" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.SectionWhereInput = {};

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      switch (key) {
        case "search":
          query.OR = [
            { name: { contains: value, mode: "insensitive" } },
            { class: { name: { contains: value, mode: "insensitive" } } }
          ];
          break;
        case "classId":
          query.classId = parseInt(value);
          break;
      }
    }
  });

  // Fetch sections with related data
  const [data, count] = await prisma.$transaction([
    prisma.section.findMany({
      where: query,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { class: { classNumber: 'asc' } },
      include: {
        class: true,
        sectionSubjects: {
          include: {
            subject: true
          }
        }
      }
    }),
    prisma.section.count({ where: query }),
  ]);

  // Fetch classes and subjects for filtering and creation/updating
  const classes = await prisma.class.findMany({
    orderBy: { classNumber: 'asc' },
    select: {
      id: true,
      name: true,
      classNumber: true,
      capacity: true
    }
  });

  const subjects = await prisma.subject.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Sections List</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <SectionFilterSelect classes={classes} selectedClassId={queryParams.classId} />
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainer 
                table="section" 
                type="create" 
                relatedData={{ classes, subjects }}
              />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default SectionListPage;