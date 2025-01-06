'use client';

import { text } from 'pdfkit';
import { width } from 'pdfkit/js/page';
import { useEffect, useState } from 'react';

interface PdfGeneratorProps {
  studentResult: {
    student: {
      name: string;
      birthday: Date;
      Class: { name: string; classNumber: number };
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
      img?: string; // Add img field for student image
    };
    marksJunior?: Array<{  // Make this optional
      classSubject: {
        subject: { 
          name: string;
          code: string;
        };
      };
      halfYearly: {
        ut1: number | null;
        ut2: number | null;
        noteBook: number | null;
        subEnrichment: number | null;
        examMarks: number | null;
        totalMarks: number | null;
        grade: string | null;
        remarks: string | null;
      } | null;
      yearly: {
        ut3: number | null;
        ut4: number | null;
        yearlynoteBook: number | null;
        yearlysubEnrichment: number | null;
        yearlyexamMarks: number | null;
        yearlytotalMarks: number | null;
        yearlygrade: string | null;
        yearlyremarks: string | null;
      } | null;
      grandTotalMarks: number | null;
      grandTotalGrade: string | null;
      overallPercentage: number | null;
    }>;
    session: {
      sessioncode: string;
      sessionfrom: Date;
      sessionto: Date;
    };
  };
  onClose: () => void;
}

export default function PdfGenerator({ studentResult, onClose }: PdfGeneratorProps) {
  useEffect(() => {
    console.log('Student Result:', studentResult);
  }, [studentResult]);

  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [studentImageData, setStudentImageData] = useState<string | null>(null);

  // Add function to load and convert image to base64
  const loadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      // Load school logo
      const logo = await loadImage('/logo.png');
      setLogoData(logo);

      // Load student image if available
      if (studentResult.student.img) {
        const studentImg = await loadImage(studentResult.student.img);
        setStudentImageData(studentImg);
      }
      
      setLoading(false);
    };
    init();
  }, [studentResult.student.img]);

  // Add this helper function
  const calculateOverallResults = (marks: any[]) => {
    let totalMarks = 0;
    
    marks.forEach(mark => {
      const halfYearlyMarks = mark.halfYearly?.totalMarks || 0;
      const yearlyMarks = mark.yearly?.yearlytotalMarks || 0;
      totalMarks += (halfYearlyMarks + yearlyMarks);
    });

    const maxPossibleMarks = marks.length * 200; // Each subject has 200 total marks (100 for each term)
    const overallPercentage = ((totalMarks / maxPossibleMarks) * 100).toFixed(2);

    return {
      totalMarks,
      overallPercentage,
      maxPossibleMarks
    };
  };

  const generateAndDownloadPDF = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;
      
      // Safely handle marksJunior data
      const safeMarksJunior = studentResult?.marksJunior ?? [];
      
      // Get the total marks and overall percentage using the new helper function
      const { totalMarks: overallTotal, overallPercentage, maxPossibleMarks } = calculateOverallResults(safeMarksJunior);

      // Updated table body rows that show the totals
      const totalRow = [
        {},
        {text: `OVER ALL TOTAL (TERM -1 & TERM 2) OF MAIN SUBJECTS`, colSpan: 9, alignment: 'center', style: 'columnHeader' },
        {}, {}, {}, {}, {}, {}, {}, {},
        {},
        {text: `${overallTotal} / ${maxPossibleMarks}`, alignment: 'center', style: 'columnHeader' },
        {}
      ];

      const percentageRow = [
        {text: `Over All Percentage:`, colSpan: 2, alignment: 'center', style: 'columnHeader' },{},
        {text: `${overallPercentage}%`, colSpan: 9, alignment: 'left', style: 'columnHeader' },
        {}, {}, {}, {}, {}, {}, {}, {},
        {text: `Overall Grade:`, alignment: 'center', style: 'columnHeader' },
        {text: `${getOverallGrade(Number(overallPercentage))}`, alignment: 'center', style: 'columnHeader' }
      ];

      // Update the tableBody to use these new rows
      const tableBody = [
        [
          { text: 'SCHOLASTIC\nAREAS', rowSpan: 1, alignment: 'center', style: 'tableHeader' },
          { text: 'TERM - 1 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
          {}, {}, {}, {},
          { text: 'TERM - 2 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
          {}, {}, {}, {},
          {},
          {}
        ],
        [
          { text: 'Subjects',alignment:'center',rowSpan: 2, style: 'tableHeader' },
          { text: 'P.T', alignment: 'center', style: 'columnHeader' },
          { text: 'N.B &\nSub\nEnrich', alignment: 'center', style: 'columnHeader' },
          { text: 'H.Y.E', alignment: 'center', style: 'columnHeader' },
          { text: 'M.O', alignment: 'center', style: 'columnHeader' },
          { text: 'GR.', alignment: 'center',rowSpan: 2, style: 'columnHeader' },
          { text: 'P.T', alignment: 'center', style: 'columnHeader' },
          { text: 'N.B &\nSub\nEnrich', alignment: 'center', style: 'columnHeader' },
          { text: 'Y.E', alignment: 'center', style: 'columnHeader' },
          { text: 'M.O', alignment: 'center', style: 'columnHeader' },
          { text: 'GR.', alignment: 'center',rowSpan: 2, style: 'columnHeader' },
          { text: 'GRAND\nTOTAL', alignment: 'center', style: 'tableHeader' },
          { text: 'GRADE', rowSpan: 2, alignment: 'center', style: 'tableHeader' }
        ],
        [
          {},
          { text: '(10)', alignment: 'center', style: 'columnHeader' },
          { text: '(10)', alignment: 'center', style: 'columnHeader' },
          { text: '(80)', alignment: 'center', style: 'columnHeader' },
          { text: '(100)', alignment: 'center', style: 'columnHeader' },
          {},
          { text: '(10)', alignment: 'center', style: 'columnHeader' },
          { text: '(10)', alignment: 'center', style: 'columnHeader' },
          { text: '(80)', alignment: 'center', style: 'columnHeader' },
          { text: '(100)', alignment: 'center', style: 'columnHeader' },
          {},
          { text: '(200)', alignment: 'center', style: 'columnHeader' }, 
          {}
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
        ]),
        totalRow,
        percentageRow
      ];

      // Define coScholasticTable correctly
      const coScholasticTable = {
        headerRows: 2,
        widths: ['40%', '10%', '40%', '10%'],
        body: [
          [
            { text: 'TERM I', style: 'tableHeader', alignment: 'center' , colSpan: 2, },
            {}, { text: 'TERM II', style: 'tableHeader', alignment: 'center' , colSpan: 2, 
            }, {}
          ],
          [
            { text: `Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]`, style: 'tableHeader', alignment: 'left' },
            { text: 'Grade', style: 'tableHeader', alignment: 'center' },
            { text: `Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]`, style: 'tableHeader', alignment: 'left' },
            { text: 'Grade', style: 'tableHeader', alignment: 'center' }
          ],
          [
            'Value Education',
            { text: 'A', alignment: 'center' },
            'Value Education',
            { text: 'A', alignment: 'center' }
          ],
          [
            'Physical Education /Sports',
            { text: 'A', alignment: 'center' },
            'Physical Education /Sports',
            { text: 'A', alignment: 'center' }
          ],
          [
            'Art & Craft',
            { text: 'A', alignment: 'center' },
            'Art & Craft',
            { text: 'A', alignment: 'center' }
          ],
          [
            'Discipline  [on a 5 Point(A - E) Grading Scale]',
            { text: 'A', alignment: 'center' },
            'Discipline  [on a 5 Point(A - E) Grading Scale]',
            { text: 'A', alignment: 'center' }
          ]
        ]
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
                width: 70,
                image: logoData || '', // Use the loaded base64 image
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
                          width: '50%',
                          stack: [
                            { text: `Student's Name: ${studentResult?.student?.name ?? '-'}`, style: 'fieldLabel' },
                            { text: `Class: ${studentResult?.student?.Class?.name?.replace('Class ', '')} - ${studentResult?.student?.Section?.name ?? '-'}`, style: 'fieldLabel' },
                            { text: `Mother's Name: ${studentResult?.student?.mothername ?? '-'}`, style: 'fieldLabel' },
                            { text: `Father's Name: ${studentResult?.student?.fathername ?? '-'}`, style: 'fieldLabel' },
                            {text: `School Address: 3K.M, Milestone, Near Garhi, Kanth (Moradabad)`, style: 'fieldLabel' },
                          ]
                        },
                        {
                          width: '30%',
                          stack: [
                            { text: `Date of Birth: ${studentResult?.student?.birthday ? new Date(studentResult.student.birthday).toLocaleDateString() : '-'}`, style: 'fieldLabel' },
                            { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                            { text: `Address: ${studentResult?.student?.address ?? '-'}, ${studentResult?.student?.city ?? '-'}, ${studentResult?.student?.village ?? '-'}`, style: 'fieldLabel' },
                          ]
                        },
                        studentImageData ?{
                          image: studentImageData || '', // Use the loaded student image
                          width: 100,
                          height: 100,
                          alignment: 'center',
                          margin: [0, 5],
                        }: {},
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
            table: coScholasticTable,
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            },
            margin: [0, 2] // Remove margin
          },
          {
            table: {
              widths: ['*'],
              body: [[
                {
                  text: '8 Point Grading Scale : A1(90% - 100%), A2(80% - 90%), B1(70% - 80%), B2(60% - 70%),\nC1(50% - 60%), C2(40% - 50%), D(33% - 40%), E(32% - Below)',
                  alignment: 'center',
                  style: 'columnHeader'
                }
              ]]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            },
            margin: [0, 0] // Remove margin
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  {
                    text: `Result: ${safeMarksJunior.every(mark => 
                      (mark.halfYearly?.grade !== 'F' && mark.yearly?.yearlygrade !== 'F')) ? 'PASSED' : 'FAILED'}`,
                    style: 'tableHeader',
                    alignment: 'center'
                  },
                  {
                    text: `Teacher Remarks: ${safeMarksJunior[0]?.yearly?.yearlyremarks ?? 'VERY GOOD WORK AND VERY WELL.'}`,
                    style: 'tableHeader',
                    alignment: 'center'
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            },
            margin: [0, 0] // Remove margin
          },
          {
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'CLASS TEACHER', alignment: 'center' },
                  { text: 'EXAMINATION I/C', alignment: 'center' },
                  { text: 'PRINCIPAL', alignment: 'center' }
                ],
                [
                  { text: '_______________', alignment: 'center' },
                  { text: '_______________', alignment: 'center' },
                  { text: '_______________', alignment: 'center' }
                ]
              ]
            },
            layout: 'noBorders',
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

  // Helper function to determine overall grade
  const getOverallGrade = (percentage: number) => {
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Student Result</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Student Name:</strong> {studentResult.student.name}</p>
        <p><strong>Admission No:</strong> {studentResult.student.admissionno}</p>
        <p><strong>Class:</strong> {studentResult.student.Class.name.replace('Class ', '')} - {studentResult.student.Section.name}</p>
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