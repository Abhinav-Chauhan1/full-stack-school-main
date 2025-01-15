import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

interface StudentResult {
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
}

export const loadImage = async (url: string) => {
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

export const getOverallGrade = (percentage: number) => {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
};

interface StudentMark {
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
  sectionSubject: {
    subject: {
      name: string;
      code: string;
    };
  };
}

const calculateOverallResults = (marks: StudentMark[]) => {
  let totalMarks = 0;
  let totalObtained = 0;
  
  marks.forEach(mark => {
    if (mark.grandTotal) {
      totalObtained += mark.grandTotal;
      totalMarks += 100;
    }
  });

  const overallPercentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : "0";

  return {
    totalObtained,
    totalMarks,
    overallPercentage: Number(overallPercentage)
  };
};


export const generatePdfDefinition9 = (
  studentResult: StudentResult,
  logoData: string | null,
  studentImageData: string | null,
  getOverallGrade: (percentage: number) => string
): TDocumentDefinitions => {
  const safeMarksSenior = studentResult?.marksSenior ?? [];
  const { totalObtained, totalMarks, overallPercentage } = calculateOverallResults(safeMarksSenior);

  const tableBody = [
    [
        { text: 'SUBJECTS', rowSpan: 3, alignment: 'center', style: 'tableHeader' },
        { text: 'Periodic Test', colSpan: 4, alignment: 'center', style: 'tableHeader' },
        {}, {}, {},
        { text: 'Multiple\nAssessment', alignment: 'center', style: 'tableHeader' },
        { text: 'Portfolio &\nSub. Enrichment', alignment: 'center', colSpan: 2, style: 'tableHeader' },
        {},
        { text: 'Best of\nPT+M.A.+\nPortfolio+S.E.\n[E=A+B+C+D]', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
        { text: 'Final\nExam', alignment: 'center', style: 'tableHeader' },
        { 
          text: 'GRAND\nTOTAL\n[E+F]', 
          alignment: 'center', 
          style: 'tableHeader',
          colSpan: 2,
          rowSpan: 2,
          margin: [0, 10, 0, 10] // Add margins to help with vertical centering
        },
        {}
      ],
      [
        {},
        { text: 'PT1', alignment: 'center', style: 'columnHeader' },
        { text: 'PT2', alignment: 'center', style: 'columnHeader' },
        { text: 'PT3', alignment: 'center', style: 'columnHeader' },
        { text: 'Avg. of\nBest two\nPT[A]', alignment: 'center', style: 'columnHeader' },
        { text: 'M.A.[B]', alignment: 'center', style: 'columnHeader' },
        { text: 'Portfolio[C]', alignment: 'center', style: 'columnHeader' },
        { text: 'S.E.[D]', alignment: 'center', style: 'columnHeader' },
        { text: 'Total', alignment: 'center', style: 'columnHeader' },
        { text: 'ANNUAL\nEXAM\n[F]', alignment: 'center', style: 'columnHeader' },
        {},
        {}
      ],
      [
        {},
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 5', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 20', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 80', alignment: 'center', style: 'outHeader' },
        { text: 'Out of 100', alignment: 'center', style: 'outHeader' },
        { text: 'G', alignment: 'center', style: 'outHeader' }
      ],
      ...safeMarksSenior.map(mark => [
        { text: mark?.sectionSubject?.subject?.name ?? '-', alignment: 'left' },
        { text: mark?.pt1 ?? '-', alignment: 'center' },
        { text: mark?.pt2 ?? '-', alignment: 'center' },
        { text: mark?.pt3 ?? '-', alignment: 'center' },
        { text: mark?.bestTwoPTAvg ?? '-', alignment: 'center' },
        { text: mark?.multipleAssessment ?? '-', alignment: 'center' },
        { text: mark?.portfolio ?? '-', alignment: 'center' },
        { text: mark?.subEnrichment ?? '-', alignment: 'center' },
        { text: mark?.bestScore ?? '-', alignment: 'center' },
        { text: mark?.finalExam ?? '-', alignment: 'center' },
        { text: mark?.grandTotal ?? '-', alignment: 'center' },
        { text: mark?.grade ?? '-', alignment: 'center' }
      ]),
      [
        { text: 'Over All Total Marks', colSpan: 11, alignment: 'right', style: 'tableHeader' },
        {}, {}, {}, {}, {}, {}, {}, {}, {},
        { text: totalObtained.toString(), alignment: 'center', style: 'tableHeader' },
        { text: getOverallGrade(Number(overallPercentage)), alignment: 'center', style: 'tableHeader' }
      ]
    ];

  // Define co-scholastic table structure
  const coScholasticTable = {
    headerRows: 1,
    widths: ['40%', '10%', '40%', '10%'], // Equal width columns
    body: [
      [
        { text: 'TERM I', colSpan: 2, style: 'tableHeader', alignment: 'center' },
        {},
        { text: 'TERM II', colSpan: 2, style: 'tableHeader', alignment: 'center' },
        {}
      ],
      [
        { text: 'Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]', style: 'fieldLabel' },
        { text: 'Grade', style: 'tableHeader', alignment: 'center' },
        { text: 'Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]', style: 'fieldLabel' },
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
      ],
    ]
  };

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [20, 20, 20, 20], // Reduced margins for better centering
    content: [
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
                        { text: `School Address: 3K.M, Milestone, Near Garhi, Kanth (Moradabad)`, style: 'fieldLabel' },
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
                    studentImageData ? {
                      width: '20%',
                      image: studentImageData,
                      fit: [100, 100],
                      alignment: 'center'
                    } : {},
                  ]
                }
              ],
              margin: [0, 0, 0, 2]
            }
          ]]
        },
        layout: 'noBorders'
      },
      // Updated marks table
      {
        table: {
          headerRows: 3,
          widths: [100, 25, 25, 25, 30, 40, 25, 25, 50, 50, 25, 25],
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
        text: 'Note:-Student Obtaining Below 33% marks in [A+B+C] indicated as (*) in Failed in That Subject.',
        style: 'note',
        margin: [0, 2]
      },

      // Co-scholastic table
      {
        table: coScholasticTable,
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        },
        margin: [0, 2]
      },

      // Grading scales
      {
        table: {
          widths: ['*'],
          body: [
            [{
              text: '8 Point Grading Scale : A1(90% - 100%), A2(80% - 90%), B1(70% - 80%), B2(60% - 70%),\nC1(50% - 60%), C2(40% - 50%), D(33% - 40%), E(32% - Below)',
              style: 'gradingScale'
            }],
            [{
              text: 'Co-Scholastic Activities (Grading on 5 point Scale) : A-5, B-4, C-3, D-2, E-1',
              style: 'gradingScale'
            }]
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        },
        margin: [0, 2]
      },

      // Result and remarks
      {
        table: {
          widths: ['50%', '50%'],
          body: [[
            {
              text: `Result: ${Number(overallPercentage) >= 33 ? 'PASSED' : 'FAILED'}`,
              style: 'tableHeader',
              alignment: 'center'
            },
            {
              text: 'Teacher Remarks: GOOD, KEEP IT UP',
              style: 'tableHeader',
              alignment: 'center'
            }
          ]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        }
      },

      // Signatures
      {
        table: {
          widths: ['33%', '34%', '33%'],
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
      // ... Same styles as PdfGenerator.tsx ...
      note: {
        fontSize: 8,
        italics: true
      },
      gradingScale: {
        fontSize: 9,
        alignment: 'center',
        margin: [0, 5]
      },
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
        bold: true
      },
      subHeader: {
        fontSize: 10,
        alignment: 'center'
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        alignment: 'center'
      },
      fieldLabel: {
        fontSize: 10,
        margin: [0, 2],
      },
      labelStyle: {
        fontSize: 10,
        bold: true,
        alignment: 'left',
        margin: [0, 2, 0, 2]
      },
      valueStyle: {
        fontSize: 10,
        alignment: 'left',
        margin: [0, 2, 0, 2]
      },
      columnHeader: {
        fontSize: 8,
        bold: true,
        alignment: 'center'
      },
      outHeader: {
        fontSize: 8,
        bold: true,
        alignment: 'center'
      }
    }
  };

  return docDefinition;
};
