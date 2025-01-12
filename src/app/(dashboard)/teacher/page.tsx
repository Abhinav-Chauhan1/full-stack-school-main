import { auth } from "@clerk/nextjs/server";
import Calender from "@/components/Calendar";
import prisma from "@/lib/prisma";

const TeacherPage = async () => {
  const { userId } = auth();
  
  const teacher = await prisma.teacher.findUnique({
    where: { id: userId || '' },
    include: {
      assignedClass: {
        include: {
          students: true,
          sections: true
        }
      }
    }
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      <div className="w-full xl:w-2/3">
        {teacher?.assignedClass && (
          <div className="mb-4 bg-white p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Assigned Class</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Class:</strong> {teacher.assignedClass.name}</p>
                <p><strong>Students:</strong> {teacher.assignedClass.students.length}</p>
              </div>
              <div>
                <p><strong>Sections:</strong> {teacher.assignedClass.sections.length}</p>
              </div>
            </div>
          </div>
        )}
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Calendar</h1>
          <Calender />
        </div>
      </div>
    </div>
  );
};

export default TeacherPage;
