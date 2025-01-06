import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Class Name",
      accessor: "name",
    },
    {
      header: "Capacity",
      accessor: "capacity",
    },
    {
      header: "Subjects",
      accessor: "subjects",
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

  const renderRow = (item: { 
    id: number; 
    name: string; 
    classNumber: number; 
    capacity: number;
    classSubjects?: {
      subject: {
        name: string;
        code: string;
      }
    }[];
  }) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">{item.name}</td>
      <td className="p-4">{item.capacity}</td>
      <td className="p-4">
        {item.classSubjects?.map(cs => 
          `${cs.subject.name} (${cs.subject.code})`
        ).join(", ")}
      </td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="class" type="update" data={{
              ...item,
              subjects: item.classSubjects?.map(cs => cs.subject.id)
            }} />
            <FormContainer table="class" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.ClassWhereInput = {};

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      switch (key) {
        case "search":
          query.name = { contains: value, mode: "insensitive" };
          break;
        // Add additional filters as needed
      }
    }
  });

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: {
        classNumber: "asc",
      },
      include: {
        classSubjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    }),
    prisma.class.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Classes List</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && (
              <FormContainer table="class" type="create" />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ClassListPage;