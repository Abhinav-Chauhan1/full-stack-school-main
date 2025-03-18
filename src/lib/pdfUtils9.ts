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
      // Added co-scholastic fields
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
  theory?: number | null;
  practical?: number | null;
  total?: number | null;
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

// Add a function to generate the co-scholastic table
const generateCoScholasticTable = (marksSenior: any[]) => {
  // Extract co-scholastic data from the first mark that has it
  let coScholasticData = null;
  for (const mark of marksSenior) {
    if (mark && mark.coScholastic) {
      coScholasticData = mark.coScholastic;
      break;
    }
  }

  // If no data provided, create a table with empty values
  if (!coScholasticData) {
    coScholasticData = {
      term1ValueEducation: "-",
      term1PhysicalEducation: "-",
      term1ArtCraft: "-",
      term1Discipline: "-",
      term2ValueEducation: "-",
      term2PhysicalEducation: "-",
      term2ArtCraft: "-",
      term2Discipline: "-"
    };
  }
  
  return {
    headerRows: 2,
    widths: ['40%', '10%', '40%', '10%'],
    body: [
      [
        { text: 'TERM I', style: 'tableHeader', alignment: 'center', colSpan: 2, fillColor: '#e6e6e6' },
        {}, 
        { text: 'TERM II', style: 'tableHeader', alignment: 'center', colSpan: 2, fillColor: '#e6e6e6' }, 
        {}
      ],
      [
        { text: `Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]`, style: 'tableHeader', alignment: 'left', fillColor: '#f2f2f2' },
        { text: 'Grade', style: 'tableHeader', alignment: 'center', fillColor: '#f2f2f2' },
        { text: `Co-Scholastic Areas : [on a 3 Point(A - C) Grading Scale]`, style: 'tableHeader', alignment: 'left', fillColor: '#f2f2f2' },
        { text: 'Grade', style: 'tableHeader', alignment: 'center', fillColor: '#f2f2f2' }
      ],
      [
        'Value Education',
        { text: coScholasticData.term1ValueEducation || '-', alignment: 'center' },
        'Value Education',
        { text: coScholasticData.term2ValueEducation || '-', alignment: 'center' }
      ],
      [
        'Physical Education /Sports',
        { text: coScholasticData.term1PhysicalEducation || '-', alignment: 'center' },
        'Physical Education /Sports',
        { text: coScholasticData.term2PhysicalEducation || '-', alignment: 'center' }
      ],
      [
        'Art & Craft',
        { text: coScholasticData.term1ArtCraft || '-', alignment: 'center' },
        'Art & Craft',
        { text: coScholasticData.term2ArtCraft || '-', alignment: 'center' }
      ],
      [
        'Discipline',
        { text: coScholasticData.term1Discipline || '-', alignment: 'center' },
        'Discipline',
        { text: coScholasticData.term2Discipline || '-', alignment: 'center' }
      ]
    ]
  };
};

export const generatePdfDefinition9 = (
  studentResult: StudentResult,
  logoData: string | null,
  studentImageData: string | null,
  getOverallGrade: (percentage: number) => string
): TDocumentDefinitions => {
  const safeMarksSenior = studentResult?.marksSenior ?? [];
  
  // Separate IT001 marks from other subjects
  const regularMarks = safeMarksSenior.filter(mark => mark.sectionSubject.subject.code !== 'IT001');
  const itMarks = safeMarksSenior.find(mark => mark.sectionSubject.subject.code === 'IT001');

  // Calculate results for regular subjects
  const { totalObtained, totalMarks, overallPercentage } = calculateOverallResults(regularMarks);
  
  // Add IT marks to the total if available
  let finalTotalObtained = totalObtained;
  let finalTotalMarks = totalMarks;
  
  if (itMarks && itMarks.total) {
    finalTotalObtained += itMarks.total;
    finalTotalMarks += 100; // IT subject is out of 100
  }
  
  // Recalculate percentage with IT included
  const finalOverallPercentage = finalTotalMarks > 0 
    ? ((finalTotalObtained / finalTotalMarks) * 100).toFixed(2) 
    : "0";

  // Regular subjects table body
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
        { text: 'Grade', alignment: 'center', style: 'outHeader' }
      ],
      ...regularMarks.map(mark => [
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
        { text: 'Vocational(I.T.)', colSpan: 3 ,rowSpan: 2, alignment: 'center'},
        {},
        {},
        { text: 'Theory\n(Out of 70)', colSpan:3, alignment: 'center', style: 'tableHeader' },
        {},
        {},
        { text: 'Practical\n(Out of 30)', colSpan: 3, alignment: 'center', style: 'tableHeader' },
        {},
        {},
        { text: 'Total\n(Out of 100)', colSpan: 3, alignment: 'center', style: 'tableHeader' },
        {},
        {},
      ],
      [
        {},{},{},
        { text: itMarks?.theory ?? '-', colSpan:3, alignment: 'center' },{},{},
        { text: itMarks?.practical ?? '-', colSpan:3, alignment: 'center' },{},{},
        { text: itMarks?.total ?? '-', colSpan:3, alignment: 'center' },{},{},
      ],
      [
        { text: 'Over All Total Marks', colSpan: 2, alignment: 'right', style: 'tableHeader' },
        {},
        { text: `${finalTotalObtained}/${finalTotalMarks}`, colSpan: 2, alignment: 'center', style: 'overallValue' },
        {},
        { text: 'Over All Percentage', colSpan: 2, alignment: 'right', style: 'tableHeader' }, {}, 
        { text: `${finalOverallPercentage}%`, colSpan: 2, alignment: 'center', style: 'overallValue' }, {},
        { text: 'Over All Grade', colSpan: 2, alignment: 'right', style: 'tableHeader' }, {},
        { text: getOverallGrade(Number(finalOverallPercentage)), colSpan: 2, alignment: 'center', style: 'overallValue' },
        {}
      ]
    ];

  // Generate co-scholastic table data
  const coScholasticTable = generateCoScholasticTable(safeMarksSenior);

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
                  { text: 'Affiliation No.: 2132869', alignment: 'center', color: 'red', fontSize: 8 },
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


      // Co-scholastic table - updated to use the generated data
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
          widths: ['*', '*'],
          body: [[
            [{
              text: `Result: ${safeMarksSenior.every(mark => 
                (mark.grade !== 'F' )) ? 'PASSED' : 'FAILED'}`,
              style: 'tableHeader',
              alignment: 'center'
            }],
            [{
              text: '8 Point Grading Scale : A1(90% - 100%), A2(80% - 90%), B1(70% - 80%), B2(60% - 70%),C1(50% - 60%), C2(40% - 50%), D(33% - 40%), E(32% - Below)',
              alignment: 'center',
              style: 'columnHeader'
            }]
          ]]
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
          widths: ['*'],
          body: [
            [
              {
                columns: [
                  { text: 'Teacher Remarks:', style: 'tableHeader', width: 120 },
                  {
                    columns: [
                      {
                        width: 'auto',
                        stack: [
                          { 
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 12, h: 12, lineWidth: 1 }],
                            width: 12
                          }
                        ]
                      },
                      { text: 'IMPROVEMENT', margin: [5, 0, 0, 0] },
                      {
                        width: 'auto',
                        stack: [
                          { 
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 12, h: 12, lineWidth: 1 }],
                            width: 12
                          }
                        ]
                      },
                      { text: 'GOOD', margin: [5, 0, 15, 0] },
                      {
                        width: 'auto',
                        stack: [
                          { 
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 12, h: 12, lineWidth: 1 }],
                            width: 12
                          }
                        ]
                      },
                      { text: 'V.GOOD', margin: [5, 0, 15, 0] },
                      {
                        width: 'auto',
                        stack: [
                          { 
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 12, h: 12, lineWidth: 1 }],
                            width: 12
                          }
                        ]
                      },
                      { text: 'EXCELLENT', margin: [5, 0, 15, 0] },
                    ],
                    width: '*'
                  }
                ]
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
      },
      overallValue: {
        fontSize: 12,
        bold: true,
        alignment: 'center'
      }
    }
  };

  return docDefinition;
};
