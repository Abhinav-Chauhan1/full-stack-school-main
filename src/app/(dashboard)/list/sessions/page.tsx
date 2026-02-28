import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Prisma, Session } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { formatDate } from "@/lib/utils";

const SessionListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Session From",
      accessor: "sessionfrom",
      className: "hidden md:table-cell",
    },
    {
      header: "Session To",
      accessor: "sessionto",
      className: "hidden lg:table-cell",
    },
    {
      header: "Session Code",
      accessor: "sessioncode",
      className: "hidden lg:table-cell",
    },
    {
      header: "Desc",
      accessor: "description",
      className: "hidden lg:table-cell",
    },
    {
      header: "Active",
      accessor: "isActive",
      className: "hidden lg:table-cell",
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

  const renderRow = (item: Session) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">
        {formatDate(item.sessionfrom)}
      </td>
      <td className="hidden md:table-cell">
        {formatDate(item.sessionto)}
      </td>
      <td className="hidden lg:table-cell">{item.sessioncode}</td>
      <td className="hidden xl:table-cell">{item.description ? item.description : "-"}</td>
      <td className="hidden sm:table-cell">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            item.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="session" type="update" data={item} />
            <FormContainer table="session" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.SessionWhereInput = {};

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      switch (key) {
        case "search":
          query.sessioncode = { contains: value, mode: "insensitive" };
          break;
        // Add additional filters as needed
      }
    }
  });

  const [data, count] = await prisma.$transaction([
    prisma.session.findMany({
      where: query,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: {
        sessionfrom: 'desc', // Most recent sessions first
      },
    }),
    prisma.session.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Sessions List</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="Filter" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainer table="session" type="create" />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default SessionListPage;
