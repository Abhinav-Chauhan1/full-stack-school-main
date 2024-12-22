"use client"; // This marks the component as a client component

import { useRouter } from "next/navigation";
import { ChangeEvent } from "react";

type SectionFilterSelectProps = {
  classes: { id: number; name: string }[];
  selectedClassId?: string;
};

const SectionFilterSelect = ({ classes, selectedClassId }: SectionFilterSelectProps) => {
  const router = useRouter();

  const handleClassChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const url = new URL(window.location.href);
    
    if (classId) {
      url.searchParams.set("classId", classId);
    } else {
      url.searchParams.delete("classId");
    }
    
    url.searchParams.set("page", "1");
    router.push(url.toString());
  };

  return (
    <select
      className="p-2 border rounded-md pr-8"
      onChange={handleClassChange}
      value={selectedClassId || ""}
    >
      <option value="">All Classes</option>
      {classes.map((classItem) => (
        <option key={classItem.id} value={classItem.id}>
          {classItem.name}
        </option>
      ))}
    </select>
  );
};

export default SectionFilterSelect;
