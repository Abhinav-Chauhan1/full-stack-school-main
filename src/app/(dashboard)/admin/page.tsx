import CountChartContainer from "@/components/CountChartContainer";
import UserCard from "@/components/UserCard";
import Calendar from "@/components/Calendar";

const AdminPage = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <div className="p-6 flex gap-6 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        {/* USER CARDS */}
        <div className="flex gap-6 justify-between flex-wrap">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
        </div>
        {/* CHARTS CONTAINER */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[500px]">
            <CountChartContainer />
          </div>
          {/* CALENDAR */}
          <div className="w-full lg:w-2/3 h-[500px]">
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
