'use client';

import { text } from 'pdfkit';
import { useEffect, useState } from 'react';

interface PdfGenerator11Props {
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
      remark?: string;
    };
    marksHigher?: Array<{
      unitTest1: number | null;
      halfYearly: number | null;
      unitTest2: number | null;
      theory: number | null;
      practical: number | null;
      totalWithout: number | null;
      grandTotal: number | null;
      total: number | null;
      percentage: number | null;
      grade: string | null;
      remarks: string | null;  // Add this line
      sectionSubject: {
        subject: {
          name: string;
          code: string;
        };
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

export default function PdfGenerator11({ studentResult, onClose }: PdfGenerator11Props) {
  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [studentImageData, setStudentImageData] = useState<string | null>(null);

  // Load images
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

  // Calculate overall results
  const calculateOverallResults = (marks: any[]) => {
    let totalMarks = 0;
    let totalObtained = 0;
    
    marks.forEach(mark => {
      if (mark.grandTotal) {
        totalObtained += mark.grandTotal;
        totalMarks += 100; // Each subject is out of 100
      }
    });

    const overallPercentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : "0";

    return {
      totalObtained,
      totalMarks,
      overallPercentage
    };
  };

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

  const generateAndDownloadPDF = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.vfs;
      
      const safeMarksHigher = studentResult?.marksHigher ?? [];
      const { totalObtained, totalMarks, overallPercentage } = calculateOverallResults(safeMarksHigher);

      const tableBody = [
        [
          { text: 'SUBJECTS', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
          { text: 'Unit Test 1', alignment: 'center', style: 'tableHeader' },
          { text: 'Half Yearly', alignment: 'center', style: 'tableHeader' },
          { text: 'Unit Test 2', alignment: 'center', style: 'tableHeader' },
          { text: 'Annual', colSpan: 2, alignment: 'center', style: 'tableHeader' },
          { text: '', alignment: 'center', style: 'tableHeader' },
          { text: 'Over All Total', colSpan: 2, alignment: 'center', style: 'tableHeader' },
          { text: '', alignment: 'center', style: 'tableHeader' }
        ],
        [
          {},
          { text: '(10)', alignment: 'center', style: 'outHeader' },
          { text: '(30)', alignment: 'center', style: 'outHeader' },
          { text: '(10)', alignment: 'center', style: 'outHeader' },
          { text: 'Theory(35)', alignment: 'center', style: 'outHeader' },
          { text: 'Practical(15)', alignment: 'center', style: 'outHeader' },
          { text: 'Total Without\nPractical\n(85)', alignment: 'center', style: 'outHeader' },
          { text: 'Grand Total\n(100)', alignment: 'center', style: 'outHeader' }
        ],
        ...safeMarksHigher.map(mark => [
          { text: mark?.sectionSubject?.subject?.name ?? '-', alignment: 'left' },
          { text: mark?.unitTest1 ?? '-', alignment: 'center' },
          { text: mark?.halfYearly ?? '-', alignment: 'center' },
          { text: mark?.unitTest2 ?? '-', alignment: 'center' },
          { text: mark?.theory ?? '-', alignment: 'center' },
          { text: mark?.practical ?? '-', alignment: 'center' },
          { text: mark?.totalWithout ?? '-', alignment: 'center' },
          { text: mark?.grandTotal ?? '-', alignment: 'center' }
        ]),
        [
          { text: 'Total', colSpan: 6, alignment: 'right', style: 'tableHeader' },
          {}, {}, {}, {}, {},
          { text:`${totalObtained.toString()} / ${totalMarks.toString()}`, alignment: 'center', style: 'tableHeader' , colSpan: 2},
          {}
        ],
        [
          { text: 'Percentage', colSpan: 6, alignment: 'right', style: 'tableHeader' },
          {}, {}, {}, {}, {},
          { text: overallPercentage.toString(), alignment: 'center', style: 'tableHeader' , colSpan: 2},
          {}
        ],
        [
          { text: 'Grade', colSpan: 6, alignment: 'right', style: 'tableHeader' },
          {}, {}, {}, {}, {},
          { text: getOverallGrade(Number(overallPercentage)), alignment: 'center', style: 'tableHeader' , colSpan: 2},
          {}
        ]
      ];

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [20, 20, 20, 20],
        content: [
          // Header with logo and school info
          {
            stack: [
              {
                columns: [
                  {
                    width: 80,
                    image: logoData || '',
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
            margin: [0, 10, 0, 10]
          },
          
          // Report Card Header
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
          
          // Student Information
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
                            { text: `Class: ${studentResult?.student?.Class?.name} - ${studentResult?.student?.Section?.name ?? '-'}`, style: 'fieldLabel' },
                            { text: `Mother's Name: ${studentResult?.student?.mothername ?? '-'}`, style: 'fieldLabel' },
                            { text: `Father's Name: ${studentResult?.student?.fathername ?? '-'}`, style: 'fieldLabel' },
                          ]
                        },
                        {
                          width: '30%',
                          stack: [
                            { text: `Date of Birth: ${new Date(studentResult?.student?.birthday).toLocaleDateString()}`, style: 'fieldLabel' },
                            { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                            { text: `Address: ${studentResult?.student?.address ?? '-'}`, style: 'fieldLabel' },
                          ]
                        },
                        studentImageData ? {
                          width: '20%',
                          image: studentImageData,
                          fit: [100, 100],
                          alignment: 'center'
                        } : {}
                      ]
                    }
                  ]
                }
              ]]
            },
            layout: 'noBorders'
          },

          // Marks Table
          {
            table: {
              headerRows: 2,
              widths: ['*', 40, 40, 40, 50, 50, 60, 50],
              body: tableBody
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            }
          },

          // Note about failing criteria
          {
            text: 'Note:-Student Obtaining Below 33% marks in total indicated as (*) in Failed in That Subject.',
            style: 'note',
            margin: [0, 2]
          },

          // Co-scholastic Activities
          {
            table: {
              headerRows: 1,
              widths: ['80%', '20%'],
              body: [
                [
                  { text: 'Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]', colSpan: 2, style: 'tableHeader', alignment: 'center' },
                  {},
                ],
                [
                  'Activities',
                  { text: 'Grade', style: 'tableHeader', alignment: 'center' },
                ],
                [
                  'Physical Education',
                  { text: 'A', alignment: 'center' },
                ],
                [
                  'Work Experience',
                  { text: 'A', alignment: 'center' },
                ],
                [
                  'Discipline',
                  { text: 'A', alignment: 'center' },
                ]
              ]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            },
            margin: [0, 10]
          },

          // Grading Scale
          {
            table: {
              widths: ['*'],
              body: [
                [{
                  text: 'Grading Scale : A1(91-100%), A2(81-90%), B1(71-80%), B2(61-70%), C1(51-60%), C2(41-50%), D(33-40%), E(Below 33%)',
                  style: 'gradingScale',
                  alignment: 'center'
                }]
              ]
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => 'black',
              vLineColor: () => 'black'
            },
            margin: [0, 10]
          },

            // Result and Attendance
            {
            columns: [
              {
              width: '50%',
              table: {
                widths: ['*'],
                body: [[
                {
                  text: `Results: ${Number(overallPercentage) >= 33 ? 'PASSED' : 'FAILED'}`,
                  style: 'tableHeader',
                  alignment: 'center'
                }
                ]]
              }
              },
              {
              width: '50%',
              table: {
                widths: ['*'],
                body: [[
                {
                  // Update this line to use the first subject's remarks or 'No remarks'
                  text: `Teacher Remarks: ${safeMarksHigher[0]?.remarks || 'No remarks'}`,
                  style: 'tableHeader',
                  alignment: 'center'
                }
                ]]
              }
              }
            ],
            columnGap: 10
            },

          // Signatures
          {
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'Class Teacher', alignment: 'center' },
                  { text: 'Principal', alignment: 'center' },
                  { text: 'Parent', alignment: 'center' }
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
            alignment: 'center',
            margin: [0, 5]
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
            bold: true,
            alignment: 'center'
          },
          tableHeader: {
            fontSize: 10,
            bold: true
          },
          columnHeader: {
            fontSize: 9,
            bold: true
          },
          outHeader: {
            fontSize: 8,
            bold: true
          },
          fieldLabel: {
            fontSize: 10,
            margin: [0, 2]
          },
          note: {
            fontSize: 8,
            italics: true
          },
          gradingScale: {
            fontSize: 9,
            alignment: 'center',
            margin: [0, 5]
          }
        }
      };

      pdfMake.createPdf(docDefinition).download(`Result_${studentResult.student.admissionno}_Class11.pdf`);
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
      <h2 className="text-xl font-semibold">Print Class 11 Result</h2>
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
