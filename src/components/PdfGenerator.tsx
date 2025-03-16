'use client';

import { useEffect, useState } from 'react';
import { loadImage, generateAndDownloadPdf } from '@/lib/pdfUtils';
import type { StudentResult } from '@/types/result';

interface PdfGeneratorProps {
  studentResult: StudentResult;
  onClose: () => void;
}

export default function PdfGenerator({ studentResult, onClose }: PdfGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [studentImageData, setStudentImageData] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Load school logo and student image
      const [logo, studentImg] = await Promise.all([
        loadImage('/logo.png'),
        studentResult.student.img ? loadImage(studentResult.student.img) : null
      ]);
      
      setLogoData(logo);
      setStudentImageData(studentImg);
      setLoading(false);
      
      // Debug the studentResult to see if co-scholastic data is present
      console.log('Student data loaded:', studentResult.student.name);
      console.log('Co-scholastic data check:');
      if (studentResult.marksJunior) {
        const hasCoScholastic = studentResult.marksJunior.some(mark => mark.coScholastic);
        console.log('Has co-scholastic data:', hasCoScholastic);
        if (hasCoScholastic) {
          console.log('Example co-scholastic data:', 
            studentResult.marksJunior.find(mark => mark.coScholastic)?.coScholastic);
        }
      }
    };
    init();
  }, [studentResult.student.img, studentResult.marksJunior, studentResult.student.name]);

  const handleGeneratePDF = async () => {
    try {
      await generateAndDownloadPdf(studentResult, logoData, studentImageData, onClose);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Optionally add error handling UI here
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Student Result</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Student Name:</strong> {studentResult.student.name}</p>
        <p><strong>Admission No:</strong> {studentResult.student.admissionno}</p>
        <p><strong>Class:</strong> {studentResult.student.Class.name}</p>
        <p><strong>Section:</strong> {studentResult.student.Section.name}</p>
        <p><strong>Session:</strong> {studentResult.session.sessioncode}</p>
      </div>
      <button
        onClick={handleGeneratePDF}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download Result
      </button>
    </div>
  );
}