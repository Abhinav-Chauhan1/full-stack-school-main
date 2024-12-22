'use client';

import { image } from 'pdfkit';
import { useEffect, useState } from 'react';

interface PdfGeneratorProps {
  studentResult: {
    student: {
      name: string;
      birthday: Date;
      Class: { name: string };
      Section: { name: string };
      admissionno: number;
      mothername: string;
      address: string;
      fathername: string;
    };
    marksJunior?: Array<{  // Make this optional
      classSubject: {
        subject: { name: string };
      };
      halfYearly: {
        ut1: number | null;
        ut2: number | null;
        noteBook: number | null;
        subEnrichment: number | null;
        examMarks: number | null;
        totalMarks: number | null;
        grade: string | null;
      } | null;
      yearly: {
        ut3: number | null;
        ut4: number | null;
        yearlynoteBook: number | null;
        yearlysubEnrichment: number | null;
        yearlyexamMarks: number | null;
        yearlytotalMarks: number | null;
        yearlygrade: string | null;
      } | null;
      grandTotalMarks: number | null;
      grandTotalGrade: string | null;
      overallPercentage: number | null;
    }>;
    session: {
      sessioncode: string;
    };
  };
  onClose: () => void;
}

export default function PdfGenerator({ studentResult, onClose }: PdfGeneratorProps) {
  const [loading, setLoading] = useState(true);

  const generateAndDownloadPDF = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;

      // Safely handle marksJunior data
      const safeMarksJunior = studentResult?.marksJunior ?? [];

      // Updated table body with new layout
      const tableBody = [
        [
          { text: 'SCHOLASTIC\nAREAS', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
          { text: 'TERM - 1 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
          {}, {}, {}, {},
          { text: 'TERM - 2 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
          {}, {}, {}, {},
          { text: 'GRAND\nTOTAL', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
          { text: 'GRADE', rowSpan: 2, alignment: 'center', style: 'tableHeader' }
        ],
        [
          {},
          { text: 'P.T\n(10)', alignment: 'center', style: 'columnHeader' },
          { text: 'N.B &\nSub\nEnrich.\n(10)', alignment: 'center', style: 'columnHeader' },
          { text: 'H.Y.E\n(80)', alignment: 'center', style: 'columnHeader' },
          { text: 'M.O\n(100)', alignment: 'center', style: 'columnHeader' },
          { text: 'GR.', alignment: 'center', style: 'columnHeader' },
          { text: 'P.T\n(10)', alignment: 'center', style: 'columnHeader' },
          { text: 'N.B &\nSub\nEnrich.\n(10)', alignment: 'center', style: 'columnHeader' },
          { text: 'Y.E\n(80)', alignment: 'center', style: 'columnHeader' },
          { text: 'M.O\n(100)', alignment: 'center', style: 'columnHeader' },
          { text: 'GR.', alignment: 'center', style: 'columnHeader' },
          {}, {}
        ],
        ...safeMarksJunior.map(mark => [
          { text: mark?.classSubject?.subject?.name ?? '-', alignment: 'left' },
          { text: mark?.halfYearly?.ut1 ?? '-', alignment: 'center' },
          { text: mark?.halfYearly?.noteBook ?? '-', alignment: 'center' },
          { text: mark?.halfYearly?.examMarks ?? '-', alignment: 'center' },
          { text: mark?.halfYearly?.totalMarks ?? '-', alignment: 'center' },
          { text: mark?.halfYearly?.grade ?? '-', alignment: 'center' },
          { text: mark?.yearly?.ut3 ?? '-', alignment: 'center' },
          { text: mark?.yearly?.yearlynoteBook ?? '-', alignment: 'center' },
          { text: mark?.yearly?.yearlyexamMarks ?? '-', alignment: 'center' },
          { text: mark?.yearly?.yearlytotalMarks ?? '-', alignment: 'center' },
          { text: mark?.yearly?.yearlygrade ?? '-', alignment: 'center' },
          { text: mark?.grandTotalMarks ?? '-', alignment: 'center' },
          { text: mark?.grandTotalGrade ?? '-', alignment: 'center' }
        ])
      ];

      const overallTotal = safeMarksJunior.reduce((acc, mark) => acc + (mark.grandTotalMarks ?? 0), 0);
      const overallPercentage = (overallTotal / (safeMarksJunior.length * 100)) * 100;

      const coScholasticTable = {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Co-Scholastic Areas', style: 'tableHeader', colSpan: 4, alignment: 'center' },
              {}, {}, {}
            ],
            ['Work Education', 'A', 'Art Education', 'B'],
            ['Health & Physical Education', 'A', 'Discipline', 'A']
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        }
      };

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 20, 40, 20],
        content: [
          // School header with improved layout
          {
            stack: [
              {
                columns: [
                  {
                    width: 60,
                    image: '/favicon.ico', // Placeholder for school logo
                    alignment: 'center'
                  },
                  {
                    stack: [
                      { text: 'Affiliation No.: 2132850', alignment: 'center', color: 'red', fontSize: 8 },
                      { text: 'HOWARD CONVENT SCHOOL', style: 'schoolName', color: '#000080' },
                      { text: 'Affiliated To C.B.S.E. New Delhi', style: 'affiliation', color: 'red' },
                      { text: 'Near Garhi, Dhampur Road, Kanth (Moradabad)', style: 'address' }
                    ],
                    alignment: 'center',
                    width: '*'
                  },
                  {
                    width: 60,
                    text: '', // Placeholder for student photo
                    alignment: 'center'
                  }
                ]
              }
            ],
            margin: [0, 0, 0, 10]
          },
          {
            text: `REPORT CARD (SESSION: ${studentResult?.session?.sessioncode ?? '2023-2024'})`,
            style: 'reportCardHeader',
            alignment: 'center',
            margin: [0, 10, 0, 5]
          },
          {
            text: '(Issued by School as per Directives of Central Board of Secondary Education, Delhi)',
            style: 'subHeader',
            alignment: 'center',
            margin: [0, 0, 0, 15]
          },
          {
            table: {
              widths: ['*'],
              body: [[
                {
                  stack: [
                    {
                      columns: [
                        {
                          width: '70%',
                          stack: [
                            { text: `Student's Name: ${studentResult?.student?.name ?? '-'}`, style: 'fieldLabel' },
                            { text: `Class & Section: ${studentResult?.student?.Class?.name ?? '-'} - ${studentResult?.student?.Section?.name ?? '-'}`, style: 'fieldLabel' },
                            { text: `Mother's Name: ${studentResult?.student?.mothername ?? '-'}`, style: 'fieldLabel' },
                            { text: `Father's Name: ${studentResult?.student?.fathername ?? '-'}`, style: 'fieldLabel' }
                          ]
                        },
                        {
                          width: '30%',
                          stack: [
                            { text: `Date Of Birth: ${studentResult?.student?.birthday ? new Date(studentResult.student.birthday).toLocaleDateString() : '-'}`, style: 'fieldLabel' },
                            { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                            { text: `Address: ${studentResult?.student?.address ?? '-'}`, style: 'fieldLabel' }
                          ]
                        }
                      ]
                    }
                  ],
                  margin: [0, 0, 0, 10]
                }
              ]]
            },
            layout: 'noBorders'
          },
          // Marks table with new layout
          {
            table: {
              headerRows: 2,
              widths: ['*', 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 35, 35],
              body: tableBody,
              dontBreakRows: true
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            }
          },
          {
            text: `OVER ALL TOTAL (TERM -1 & TERM 2) OF MAIN SUBJECTS ${overallTotal}/1400`,
            margin: [0, 10]
          },
          {
            text: `Over All Percentage: ${overallPercentage.toFixed(2)}%`,
            margin: [0, 5]
          },
          coScholasticTable,
          {
            text: '8 Point Grading Scale : A1(90% - 100%), A2(80% - 90%), B1(70% - 80%), B2(60% - 70%),\nC1(50% - 60%), C2(40% - 50%), D(33% - 40%), E(32% - Below)',
            alignment: 'center',
            margin: [0, 10]
          },
          {
            text: 'Result: Passed',
            alignment: 'left',
            margin: [0, 10]
          },
          {
            text: 'Teacher Remarks: VERY GOOD WORK AND VERY WELL.',
            margin: [0, 5]
          },
          {
            columns: [
              { text: 'CLASS TEACHER', alignment: 'left' },
              { text: 'EXAMINATION I/C', alignment: 'center' },
              { text: 'PRINCIPAL', alignment: 'right' }
            ],
            margin: [0, 20]
          }
        ],
        styles: {
          schoolName: {
            fontSize: 24,
            bold: true,
            alignment: 'center'
          },
          affiliation: {
            fontSize: 14,
            bold: true,
            alignment: 'center'
          },
          address: {
            fontSize: 12,
            alignment: 'center'
          },
          reportCardHeader: {
            fontSize: 14,
            bold: true
          },
          subHeader: {
            fontSize: 10,
            alignment: 'center'
          },
          columnHeader: {
            fontSize: 9
          },
          fieldLabel: {
            fontSize: 10,
            margin: [0, 0, 0, 5]
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            alignment: 'center'
          },
          tableCell: {
            fontSize: 9,
            alignment: 'center'
          }
        }
      };

      pdfMake.createPdf(docDefinition).download(`Result_${studentResult.student.admissionno}.pdf`);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

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
        onClick={generateAndDownloadPDF}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download Result
      </button>
    </div>
  );
}