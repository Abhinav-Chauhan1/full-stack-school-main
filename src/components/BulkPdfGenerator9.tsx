'use client';

import { useEffect, useState } from 'react';
import { loadImage, generatePdfDefinition9, getOverallGrade } from '@/lib/pdfUtils9';

interface BulkPdfGenerator9Props {
  studentsResults: Array<{
    student: any;
    marksSenior: any[];
    session: any;
  }>;
  onClose: () => void;
}

export default function BulkPdfGenerator9({ studentsResults, onClose }: BulkPdfGenerator9Props) {
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

  const generateAndDownloadPDFs = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;

      for (const studentResult of studentsResults) {
        const studentImageData = studentImages.get(studentResult.student.id);
        const pdfDefinition = generatePdfDefinition9(
          studentResult, 
          logoData, 
          studentImageData ?? null,
          getOverallGrade
        );
        
        pdfMake.createPdf(pdfDefinition).download(
          `Result_${studentResult.student.admissionno}_Class9.pdf`
        );
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
      <h2 className="text-xl font-semibold">Print Class 9 Results</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Class:</strong> {studentsResults[0]?.student.Class.name}</p>
        <p><strong>Section:</strong> {studentsResults[0]?.student.Section.name}</p>
        <p><strong>Total Students:</strong> {studentsResults.length}</p>
      </div>
      <button
        onClick={generateAndDownloadPDFs}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download All Results
      </button>
    </div>
  );
}
