'use client';

import { useEffect, useState } from 'react';
import { loadImage, generateAndDownloadPdf11 } from '@/lib/pdfUtils11';

interface BulkPdfGenerator11Props {
  studentsResults: Array<{
    student: any;
    marksHigher: any[];
    session: any;
  }>;
  onClose: () => void;
}

export default function BulkPdfGenerator11({ studentsResults, onClose }: BulkPdfGenerator11Props) {
  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [studentImages, setStudentImages] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const init = async () => {
      const logo = await loadImage('/logo.png');
      setLogoData(logo);

      const imagePromises = studentsResults.map(async ({ student }) => {
        if (student.img) {
          const imgData = await loadImage(student.img);
          return [student.id, imgData] as [string, string];
        }
        return null;
      });

      const loadedImages = await Promise.all(imagePromises);
      const imageMap = new Map(loadedImages.filter((item): item is [string, string] => item !== null));
      setStudentImages(imageMap);
      
      setLoading(false);
    };
    init();
  }, [studentsResults]);

  const handleBulkDownload = async () => {
    try {
      for (const studentResult of studentsResults) {
        const studentImage = studentImages.get(studentResult.student.id) || null;
        await generateAndDownloadPdf11(studentResult, logoData, studentImage, () => {});
      }
      onClose();
    } catch (error) {
      console.error('Error generating PDFs:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Class 11 Results</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Class:</strong> {studentsResults[0]?.student.Class.name}</p>
        <p><strong>Section:</strong> {studentsResults[0]?.student.Section.name}</p>
        <p><strong>Total Students:</strong> {studentsResults.length}</p>
      </div>
      <button
        onClick={handleBulkDownload}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download All Results
      </button>
    </div>
  );
}
