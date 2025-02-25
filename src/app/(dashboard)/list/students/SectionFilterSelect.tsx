'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Section {
  id: number;
  name: string;
  classId: number;
}

interface SectionFilterSelectProps {
  sections: Section[];
  selectedSectionId?: string;
  selectedClassId?: string;
}

const SectionFilterSelect = ({ sections, selectedSectionId, selectedClassId }: SectionFilterSelectProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set('sectionId', value);
    } else {
      params.delete('sectionId');
    }

    router.push(`?${params.toString()}`);
  };

  // Filter sections based on selected class
  const filteredSections = selectedClassId 
    ? sections.filter(section => section.classId === parseInt(selectedClassId))
    : sections;

  return (
    <select
      className="px-2 py-1 border rounded"
      onChange={(e) => handleChange(e.target.value)}
      value={selectedSectionId || ''}
    >
      <option value="">All Sections</option>
      {filteredSections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.name}
        </option>
      ))}
    </select>
  );
};

export default SectionFilterSelect;
