import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Student, Prisma } from "@prisma/client";
import Image from "next/image";

const AlumniListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const columns = [
    {
      header: "Alumni Info",
      accessor: "name",
    },
    {
      header: "Alumni Year",
      accessor: "alumniYear",
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
  ];

  const renderRow = (item: Student) => (
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
            <span className="text-xs text-gray-500">Last Class: {item.previousClass}</span>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell">{item.alumniYear || "-"}</td>
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
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Build the query based on search parameters
  const query: Prisma.StudentWhereInput = {
    isAlumni: true
  };

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
          case "alumniYear":
            query.alumniYear = parseInt(value);
            break;
        }
      }
    });
  }

  // Fetch alumni with related data
  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: [
        { alumniYear: 'desc' },
        { name: 'asc' }
      ],
    }),
    prisma.student.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Alumni List</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image 
                src="/sort.png" 
                alt="Sort" 
                width={14} 
                height={14}
                style={{ width: 'auto', height: 'auto' }}
              />
            </button>
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AlumniListPage;
