import { auth } from "@clerk/nextjs/server";
import Calender from "@/components/Calendar";
import prisma from "@/lib/prisma";
import Image from "next/image";

const TeacherPage = async () => {
  const { userId } = auth();
  
  const teacher = await prisma.teacher.findUnique({
    where: { id: userId || '' },
    include: {
      assignedClass: true,
      assignedSection: {
        include: {
          students: {
            select: {
              id: true,
              name: true,
              admissionno: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      },
    }
  });

  return (
    <div className="flex-1 p-4 flex gap-4">
      <div className="w-full space-y-4">
        {/* Teacher Profile Card */}
        <div className="bg-white p-6 rounded-md shadow">
          <div className="flex items-center gap-4 mb-4">
            <Image
              src={teacher?.img || "/noAvatar.png"}
              alt="Profile"
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">{teacher?.name}</h2>
              <p className="text-gray-600">{teacher?.designation}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{teacher?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{teacher?.phone}</p>
            </div>
          </div>
        </div>

        {/* Assignment Information Card */}
        {(teacher?.assignedClass || teacher?.assignedSection) && (
          <div className="bg-white p-6 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Class Assignment</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">Assigned To:</span>
                <span className="font-medium">
                  {teacher.assignedClass?.name}
                  {teacher.assignedSection && ` - ${teacher.assignedSection.name}`}
                </span>
              </div>
              
              {teacher.assignedSection && (
                <div className="space-y-2">
                  <p className="text-gray-600 font-medium">Students ({teacher.assignedSection.students.length})</p>
                  <div className="max-h-48 overflow-y-auto">
                    {teacher.assignedSection.students.map((student) => (
                      <div key={student.id} className="flex justify-between items-center py-1 text-sm">
                        <span>{student.name}</span>
                        <span className="text-gray-500">#{student.admissionno}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Section with fixed height */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Calendar</h2>
          <div className="h-[600px] overflow-hidden">
            <Calender />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPage;
