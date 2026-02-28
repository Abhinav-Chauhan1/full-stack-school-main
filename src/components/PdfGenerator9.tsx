'use client';

import { useEffect, useState } from 'react';
import { loadImage, generatePdfDefinition9, getOverallGrade } from '@/lib/pdfUtils9';

interface PdfGenerator9Props {
  studentResult: {
    student: {
      name: string;
      birthday: Date;
      Class: { name: string };
      Section: { name: string };
      admissionno: number;
      mothername: string;
      moccupation: string;
      fathername: string;
      foccupation: string;
      address: string;
      city: string;
      village: string;
      bloodgroup: string;
      img?: string;
    };
    marksSenior?: Array<{
      pt1: number | null;
      pt2: number | null;
      pt3: number | null;
      bestTwoPTAvg: number | null;
      multipleAssessment: number | null;
      portfolio: number | null;
      subEnrichment: number | null;
      bestScore: number | null;
      finalExam: number | null;
      grandTotal: number | null;
      grade: string | null;
      remarks: string | null;
      theory?: number | null;
      practical?: number | null;
      total?: number | null;
      sectionSubject: {
        subject: {
          name: string;
          code: string;
        };
      };
      coScholastic?: {
        term1ValueEducation?: string;
        term1PhysicalEducation?: string;
        term1ArtCraft?: string;
        term1Discipline?: string;
        term2ValueEducation?: string;
        term2PhysicalEducation?: string;
        term2ArtCraft?: string;
        term2Discipline?: string;
      };
    }>;
    session: {
      sessioncode: string;
      sessionfrom: Date;
      sessionto: Date;
    };
  };
  onClose: () => void;
}

export default function PdfGenerator9({ studentResult, onClose }: PdfGenerator9Props) {
  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [studentImageData, setStudentImageData] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const logo = await loadImage('/logo.png');
      setLogoData(logo);

      if (studentResult.student.img) {
        const studentImg = await loadImage(studentResult.student.img);
        setStudentImageData(studentImg);
      }
      
      setLoading(false);
    };
    init();
  }, [studentResult.student.img]);

  const generateAndDownloadPDF = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;
      
      const docDefinition = generatePdfDefinition9(studentResult, logoData, studentImageData, getOverallGrade);
      pdfMake.createPdf(docDefinition).download(`Result_${studentResult.student.admissionno || studentResult.student.name}_Class9.pdf`);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Class 9 Result</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Student Name:</strong> {studentResult.student.name}</p>
        <p><strong>Admission No:</strong> {studentResult.student.admissionno}</p>
        <p><strong>Class:</strong> {studentResult.student.Class.name}</p>
        <p><strong>Section:</strong> {studentResult.student.Section.name}</p>
        <p><strong>Session:</strong> {studentResult.session.sessioncode}</p>
      </div>
      <button
        onClick={generateAndDownloadPDF}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download Result
      </button>
    </div>
  );
}
