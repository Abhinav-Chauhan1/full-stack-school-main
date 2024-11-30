"use client"; 

import { useState } from "react";

interface Subject {
  id: number;
  name: string;
}

interface SubjectSelectionDropdownProps {
  selectedSubjects: number[];
  availableSubjects: Subject[];
  onChange: (selectedSubjectIds: number[]) => void;
}

const SubjectSelectionDropdown = ({
  selectedSubjects,
  availableSubjects,
  onChange,
}: SubjectSelectionDropdownProps) => {
  const [selected, setSelected] = useState<number[]>(selectedSubjects);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(event.target.selectedOptions, option => parseInt(option.value));
    setSelected(selectedIds);
    onChange(selectedIds); // Call the parent's onChange handler
  };

  return (
    <select multiple value={selected} onChange={handleChange} className="p-2 rounded border">
      {availableSubjects.map(subject => (
        <option key={subject.id} value={subject.id}>
          {subject.name}
        </option>
      ))}
    </select>
  );
};

export default SubjectSelectionDropdown;
