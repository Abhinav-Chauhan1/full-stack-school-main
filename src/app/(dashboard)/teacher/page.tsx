import { auth } from "@clerk/nextjs/server";
import Calender from "@/components/Calendar";

const TeacherPage = () => {
  const { userId } = auth();
  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Calender</h1>
          <Calender />
        </div>
      </div>
    </div>
  );
};

export default TeacherPage;
