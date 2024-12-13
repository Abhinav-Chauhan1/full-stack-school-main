'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import pdfmake
const pdfMakeDynamic = dynamic(() => import('pdfmake/build/pdfmake'), { ssr: false });
const pdfFontsDynamic = dynamic(() => import('pdfmake/build/vfs_fonts'), { ssr: false });

interface JuniorMarkPDFData {
  student: {
    name: string;
    admissionno: number;
  };
  marks: {
    ut1?: number | null;
    ut2?: number | null;
    noteBook?: number | null;
    subEnrichment?: number | null;
    examMarks?: number | null;
    totalMarks?: number | null;
    grade?: string | null;
  };
  subject: string;
  session: string;
  examType: 'HALF_YEARLY' | 'YEARLY';
}

export function useJuniorMarksPDFExport() {
  const [pdfMake, setPdfMake] = useState<any>(null);

  useEffect(() => {
    const loadPdfMake = async () => {
      try {
        const pdfMakeModule = await pdfMakeDynamic;
        const pdfFontsModule = await pdfFontsDynamic;
        
        // Load fonts
        pdfMakeModule.vfs = pdfFontsModule.pdfMake.vfs;
        setPdfMake(pdfMakeModule);
      } catch (error) {
        console.error('Failed to load pdfmake', error);
      }
    };

    loadPdfMake();
  }, []);

  const generateJuniorMarksPDF = (
    data: JuniorMarkPDFData[],
    options?: {
      title?: string;
      subtitle?: string;
    }
  ) => {
    if (!pdfMake) {
      console.error('PDFMake not loaded');
      return;
    }

    // Default options
    const {
      title = 'Junior Marks Report',
      subtitle = `Generated on ${new Date().toLocaleDateString()}`
    } = options || {};

    // Prepare table body
    const tableBody: any[][] = [
      // Table header
      [
        { text: 'Student Name', style: 'tableHeader' },
        { text: 'Admission No', style: 'tableHeader' },
        { text: 'Subject', style: 'tableHeader' },
        { text: 'UT1/UT3', style: 'tableHeader' },
        { text: 'UT2/UT4', style: 'tableHeader' },
        { text: 'Notebook', style: 'tableHeader' },
        { text: 'Sub Enrichment', style: 'tableHeader' },
        { text: 'Exam Marks', style: 'tableHeader' },
        { text: 'Total Marks', style: 'tableHeader' },
        { text: 'Grade', style: 'tableHeader' }
      ]
    ];

    // Populate table body
    data.forEach(item => {
      tableBody.push([
        item.student.name,
        item.student.admissionno.toString(),
        item.subject,
        item.marks.ut1?.toString() ?? '-',
        item.marks.ut2?.toString() ?? '-',
        item.marks.noteBook?.toString() ?? '-',
        item.marks.subEnrichment?.toString() ?? '-',
        item.marks.examMarks?.toString() ?? '-',
        item.marks.totalMarks?.toString() ?? '-',
        item.marks.grade ?? '-'
      ]);
    });

    // PDF Document Definition
    const documentDefinition = {
      content: [
        { text: title, style: 'header' },
        { text: subtitle, style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 12,
          margin: [0, 0, 0, 10]
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: 'black',
          fillColor: '#f2f2f2'
        }
      },
      pageSize: 'A4',
      pageOrientation: 'landscape'
    };

    // Generate and open PDF
    pdfMake.createPdf(documentDefinition).open();
  };

  return { generateJuniorMarksPDF, pdfMakeLoaded: !!pdfMake };
}

// Utility function to prepare data for PDF export
export function prepareJuniorMarksPDFData(
  data: any[], 
  examType: 'HALF_YEARLY' | 'YEARLY'
): JuniorMarkPDFData[] {
  return data.map(item => ({
    student: {
      name: item.student.name,
      admissionno: item.student.admissionno
    },
    marks: examType === 'HALF_YEARLY' 
      ? {
          ut1: item.halfYearly?.ut1,
          ut2: item.halfYearly?.ut2,
          noteBook: item.halfYearly?.noteBook,
          subEnrichment: item.halfYearly?.subEnrichment,
          examMarks: item.halfYearly?.examMarks,
          totalMarks: item.halfYearly?.totalMarks,
          grade: item.halfYearly?.grade
        }
      : {
          ut1: item.yearly?.ut3,
          ut2: item.yearly?.ut4,
          noteBook: item.yearly?.yearlynoteBook,
          subEnrichment: item.yearly?.yearlysubEnrichment,
          examMarks: item.yearly?.yearlyexamMarks,
          totalMarks: item.yearly?.yearlytotalMarks,
          grade: item.yearly?.yearlygrade
        },
    subject: item.classSubject.subject.name,
    session: item.session.sessioncode,
    examType
  }));
}