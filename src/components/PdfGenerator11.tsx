'use client';

import { useEffect, useState } from 'react';
import { loadImage, generateAndDownloadPdf11 } from '@/lib/pdfUtils11';
import type { StudentResult11 } from '@/types/result';

interface PdfGenerator11Props {
  studentResult: StudentResult11;
  onClose: () => void;
}

export default function PdfGenerator11({ studentResult, onClose }: PdfGenerator11Props) {
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
    };
    init();
  }, [studentResult.student.img]);

  const handleGeneratePDF = async () => {
    try {
      await generateAndDownloadPdf11(studentResult, logoData, studentImageData, onClose);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Class 11 Result</h2>
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
