'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Class {
  id: number;
  name: string;
  classNumber: number;
}

interface ClassFilterSelectProps {
  classes: Class[];
  selectedClassId?: string;
}

const ClassFilterSelect = ({ classes, selectedClassId }: ClassFilterSelectProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set('classId', value);
    } else {
      params.delete('classId');
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <select
      className="px-2 py-1 border rounded"
      onChange={(e) => handleChange(e.target.value)}
      value={selectedClassId || ''}
    >
      <option value="">All Classes</option>
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  );
};

export default ClassFilterSelect;