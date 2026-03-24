'use client';

import { useState } from 'react';
import { loadImage, generatePdfDefinition } from '@/lib/pdfUtils';
import { filterLanguageSubjects } from '@/lib/pdfUtils';

interface ClassBulkPdfButtonProps {
  classId: string;
  sectionId: string;
  sessionId: string;
  className?: string;
  sectionName?: string;
}

export default function ClassBulkPdfButton({ classId, sectionId, sessionId, className: cls, sectionName }: ClassBulkPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setProgress('Fetching student data...');
    try {
      const res = await fetch(
        `/api/class-bulk-pdf?classId=${classId}&sectionId=${sectionId}&sessionId=${sessionId}`
      );
      if (!res.ok) throw new Error('Failed to fetch student data');
      const { students } = await res.json();

      if (!students || students.length === 0) {
        setProgress('No students found');
        return;
      }

      setProgress('Loading images...');
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;

      const logoData = await loadImage('/logo.png');

      // Load student images in parallel
      const imageEntries = await Promise.all(
        students.map(async (s: any) => {
          if (s.student.img) {
            const imgData = await loadImage(s.student.img);
            return [s.student.id, imgData] as [string, string | null];
          }
          return [s.student.id, null] as [string, null];
        })
      );
      const imageMap = new Map(imageEntries);

      setProgress('Building merged PDF...');

      // Collect all page content from each student's PDF definition
      const allContent: any[] = [];
      const mergedStyles: any = {};

      for (let i = 0; i < students.length; i++) {
        const studentResult = students[i];
        setProgress(`Processing ${i + 1} / ${students.length}: ${studentResult.student.name}`);

        const filteredMarks = filterLanguageSubjects(studentResult.marksJunior);
        const resultWithFiltered = { ...studentResult, marksJunior: filteredMarks };
        const studentImage = imageMap.get(studentResult.student.id) ?? null;

        const docDef = generatePdfDefinition(resultWithFiltered, logoData, studentImage);

        // Add page break before each student except the first
        if (i > 0) {
          const firstItem = (docDef.content as any[])[0];
          if (firstItem && typeof firstItem === 'object') {
            firstItem.pageBreak = 'before';
          }
        }

        allContent.push(...(docDef.content as any[]));

        // Merge styles (they're the same for all students, so this is fine)
        if (docDef.styles) {
          Object.assign(mergedStyles, docDef.styles);
        }
      }

      // Build a single merged document
      const mergedDoc = {
        pageSize: 'A4' as const,
        pageOrientation: 'portrait' as const,
        pageMargins: [15, 10, 15, 10] as [number, number, number, number],
        compress: true,
        content: allContent,
        styles: mergedStyles,
      };

      const fileName = `Results_${cls || 'Class'}_${sectionName || 'Section'}.pdf`;
      pdfMake.createPdf(mergedDoc).download(fileName);

      setProgress('Done!');
      setTimeout(() => setProgress(''), 2000);
    } catch (err) {
      console.error(err);
      setProgress('Error generating PDF');
      setTimeout(() => setProgress(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={loading}
        title="Download all student report cards as a single merged PDF"
        className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {loading ? 'Generating...' : 'Export All PDFs'}
      </button>
      {progress && (
        <span className="text-xs text-gray-500 max-w-[200px] truncate">{progress}</span>
      )}
    </div>
  );
}
