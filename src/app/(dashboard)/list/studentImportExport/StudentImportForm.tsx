'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { Class, Section } from '@prisma/client';
import { importStudentsWithMarks } from './actions';

interface ImportFormProps {
  classes: (Class & { sections: Section[] })[];
}

const StudentImportForm = ({ classes }: ImportFormProps) => {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [includeMarks, setIncludeMarks] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : [];

  // ...existing code for handleFileUpload...

  const handleImport = async () => {
    if (!file || !selectedClass || !selectedSection) {
      alert('Please select class, section and file');
      return;
    }

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const result = await importStudentsWithMarks({
        students: jsonData,
        classId: parseInt(selectedClass),
        sectionId: parseInt(selectedSection),
        includeMarks
      });

      if (!result.success) {
        throw new Error('Failed to import students');
      }

      alert('Students imported successfully!');
      setFile(null);
      setSelectedClass('');
      setSelectedSection('');
      router.refresh();
      router.push('/list/students');
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'Error importing students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 mb-6">
      {/* ...existing class and section selectors... */}

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeMarks}
            onChange={(e) => setIncludeMarks(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>Include Student Marks</span>
        </label>
      </div>

      {/* ...existing file upload and import button... */}

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Excel File Format</h2>
        <p className="text-sm text-gray-600 mb-2">
          Please ensure your Excel file has the following columns:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          {/* ...existing student fields... */}
          {includeMarks && (
            <>
              <li className="font-semibold mt-2">Marks Fields (Optional):</li>
              <li>unitTest1</li>
              <li>halfYearly</li>
              <li>unitTest2</li>
              <li>theory</li>
              <li>practical</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default StudentImportForm;
