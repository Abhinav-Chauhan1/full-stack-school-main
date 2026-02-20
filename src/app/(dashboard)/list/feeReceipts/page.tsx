import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Select from "@/components/Select";
import Image from "next/image";

const FeeReceiptsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const { page, sessionId, classId, month } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Fetch sessions and classes for filters
  const sessions = await prisma.session.findMany({
    orderBy: { sessionfrom: "desc" },
  });

  const classes = await prisma.class.findMany({
    orderBy: { classNumber: "asc" },
  });

  // Build query
  const query: any = {};

  if (sessionId) {
    query.sessionId = parseInt(sessionId);
  }

  if (classId) {
    query.student = {
      classId: parseInt(classId),
    };
  }

  if (month) {
    query.month = month;
  }

  // Fetch fee receipts
  const [receipts, count] = await prisma.$transaction([
    prisma.feeReceipt.findMany({
      where: query,
      include: {
        student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        session: true,
      },
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.feeReceipt.count({ where: query }),
  ]);

  const columns = [
    {
      header: "Receipt No",
      accessor: "receiptNo",
    },
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Amount",
      accessor: "amount",
      className: "hidden lg:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden lg:table-cell",
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
            Fee Receipts
          </h1>
          <div className="flex items-center gap-4">
            {role === "admin" && (
              <FormContainer table="feeReceipt" type="create" />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TableSearch />
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
            name="month"
            label="Month"
            options={[
              { value: "January", label: "January" },
              { value: "February", label: "February" },
              { value: "March", label: "March" },
              { value: "April", label: "April" },
              { value: "May", label: "May" },
              { value: "June", label: "June" },
              { value: "July", label: "July" },
              { value: "August", label: "August" },
              { value: "September", label: "September" },
              { value: "October", label: "October" },
              { value: "November", label: "November" },
              { value: "December", label: "December" },
            ]}
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="mt-6">
        <Table
          columns={columns}
          data={receipts}
          renderRow={(receipt) => (
            <tr
              key={receipt.id}
              className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
            >
              <td className="p-4">{receipt.receiptNo}</td>
              <td>
                <div className="flex flex-col">
                  <span className="font-semibold">{receipt.student.name}</span>
                  <span className="text-xs text-gray-500">
                    Adm: {receipt.student.admissionno}
                  </span>
                </div>
              </td>
              <td className="hidden md:table-cell">
                {receipt.student.Class?.name} - {receipt.student.Section?.name}
              </td>
              <td className="hidden lg:table-cell">₹{receipt.totalAmount}</td>
              <td className="hidden lg:table-cell">
                {new Date(receipt.paymentDate).toLocaleDateString()}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <FormContainer
                    table="feeReceipt"
                    type="print"
                    id={receipt.id}
                  />
                  {role === "admin" && (
                    <>
                      <FormContainer
                        table="feeReceipt"
                        type="update"
                        id={receipt.id}
                        data={receipt}
                      />
                      <FormContainer
                        table="feeReceipt"
                        type="delete"
                        id={receipt.id}
                      />
                    </>
                  )}
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

export default FeeReceiptsPage;
