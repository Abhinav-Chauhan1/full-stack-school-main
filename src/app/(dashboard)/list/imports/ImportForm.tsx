'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { importStudents } from './actions';
import { useRouter } from 'next/navigation';
import { Class, Section } from '@prisma/client';

interface ImportFormProps {
  classes: (Class & { sections: Section[] })[];
}

const ImportForm = ({ classes }: ImportFormProps) => {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Get sections for selected class
  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

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

      // Validate required fields and data types
      const validatedData = jsonData.map((row: any) => {
        // Validate required fields
        const requiredFields = [
          'admissionno', 
          'name', 
          'Sex', 
          'birthday', 
          'Religion', 
          'tongue', 
          'category',
          'yearofpass' // Add yearofpass to required fields
        ];
        for (const field of requiredFields) {
          if (!row[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Validate unique fields
        if (!row.mphone || !row.fphone || !row.admissionno) {
          throw new Error('Phone numbers and admission number are required and must be unique');
        }

        // Convert and validate dates
        const admissiondate = row.admissiondate ? new Date(row.admissiondate) : new Date();
        const birthday = new Date(row.birthday);
        if (isNaN(birthday.getTime())) {
          throw new Error('Invalid birthday format');
        }

        // Validate phone numbers
        const mphone = row.mphone?.toString();
        const fphone = row.fphone?.toString();
        
        if (!mphone || !fphone || mphone.length < 10 || fphone.length < 10) {
          throw new Error('Invalid phone numbers - must be at least 10 digits');
        }

        // Validate aadhar card
        const aadharcard = row.aadharcard?.toString() || '';
        if (aadharcard && aadharcard.length !== 12) {
          throw new Error('Aadhar card number must be 12 digits');
        }

        return {
          admissiondate,
          admissionno: parseInt(row.admissionno.toString()),
          name: String(row.name),
          address: String(row.address || ''),
          city: String(row.city || ''),
          village: String(row.village || ''),
          Sex: row.Sex,
          birthday,
          nationality: String(row.nationality || 'Indian'),
          Religion: row.Religion,
          tongue: row.tongue,
          category: row.category,
          mothername: String(row.mothername || ''),
          mphone: mphone,                    // Now properly converted to string
          moccupation: String(row.moccupation || ''),
          fathername: String(row.fathername || ''),
          fphone: fphone,                    // Now properly converted to string
          foccupation: String(row.foccupation || ''),
          aadharcard: aadharcard,
          house: String(row.house || ''),
          bloodgroup: row.bloodgroup || 'O_plus',
          yearofpass: parseInt(row.yearofpass.toString()),
          board: String(row.board || ''),
          school: String(row.school || ''),
          grade: String(row.grade || ''),
          document: String(row.document || ''),
          tcdate: new Date(),
          tcNo: parseInt(row.tcNo?.toString() || '0'),
          classId: parseInt(selectedClass),
          sectionId: parseInt(selectedSection),
        };
      });

      const result = await importStudents(validatedData);

      if (!result.success) {
        throw new Error(result.error);
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
      <div>
        <label className="block mb-2">Select Class</label>
        <select 
          className="w-full p-2 border rounded"
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setSelectedSection(''); // Reset section when class changes
          }}
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">Select Section</label>
        <select 
          className="w-full p-2 border rounded"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">Select Section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">Upload Excel File</label>
        <input 
          type="file" 
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handleImport}
        disabled={loading || !selectedClass || !selectedSection || !file}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Importing...' : 'Import Students'}
      </button>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Excel File Format</h2>
        <p className="text-sm text-gray-600 mb-2">
          Please ensure your Excel file has the following columns:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>admissiondate (Date format: YYYY-MM-DD)</li>
          <li>admissionno (Unique number)</li>
          <li>name</li>
          <li>address</li>
          <li>city</li>
          <li>village</li>
          <li>Sex (Male/Female/Other)</li>
          <li>birthday (Date format: YYYY-MM-DD)</li>
          <li>nationality</li>
          <li>Religion (Hindu/Muslim/Christian/Sikh/Usmani/Raeen/MominAnsar)</li>
          <li>tongue (Hindi/English/Punjabi/Urdu/Bhojpuri/Gujarati)</li>
          <li>category (General/SC/ST/OBC/Other)</li>
          <li>mothername</li>
          <li>mphone (Unique phone number)</li>
          <li>moccupation</li>
          <li>fathername</li>
          <li>fphone (Unique phone number)</li>
          <li>foccupation</li>
          <li>aadharcard</li>
          <li>house</li>
          <li>bloodgroup (A_plus/A_minus/B_plus/B_minus/O_plus/O_minus/AB_plus/AB_minus)</li>
          <li>tcNo (Transfer Certificate Number)</li>
          <li>yearofpass (Required: Year of passing previous class)</li>
          <li>board (Optional: Previous school board)</li>
          <li>school (Optional: Previous school name)</li>
          <li>grade (Optional: Previous class grade)</li>
          <li>document (Optional: Document references)</li>
        </ul>
        <div className="mt-4">
          <a 
            href="/sample-student-import.xlsx" 
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            Download Sample Excel Template
          </a>
        </div>
      </div>
    </div>
  );
};

export default ImportForm;
