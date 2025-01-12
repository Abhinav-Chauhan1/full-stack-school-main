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

export const generatePdfDefinition = (studentResult: any, logoData: string | null, studentImageData: string | null, getOverallGrade: (percentage: number) => string) => {
  // Calculate overall results
  const marks = studentResult.marksJunior || [];
  let totalMarks = 0;
  marks.forEach((mark: any) => {
    const halfYearlyMarks = mark.halfYearly?.totalMarks || 0;
    const yearlyMarks = mark.yearly?.yearlytotalMarks || 0;
    totalMarks += (halfYearlyMarks + yearlyMarks);
  });

  const maxPossibleMarks = marks.length * 200;
  const overallPercentage = ((totalMarks / maxPossibleMarks) * 100).toFixed(2);

  // Generate table body for marks
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
      { text: 'P.T', alignment: 'center', style: 'columnHeader' },
      { text: 'N.B &\nSub\nEnrich', alignment: 'center', style: 'columnHeader' },
      { text: 'H.Y.E', alignment: 'center', style: 'columnHeader' },
      { text: 'M.O', alignment: 'center', style: 'columnHeader' },
      { text: 'GR.', alignment: 'center', style: 'columnHeader' },
      { text: 'P.T', alignment: 'center', style: 'columnHeader' },
      { text: 'N.B &\nSub\nEnrich', alignment: 'center', style: 'columnHeader' },
      { text: 'Y.E', alignment: 'center', style: 'columnHeader' },
      { text: 'M.O', alignment: 'center', style: 'columnHeader' },
      { text: 'GR.', alignment: 'center', style: 'columnHeader' },
      {},
      {}
    ],
    [
      { text: '', alignment: 'center' },
      { text: '(10)', alignment: 'center', style: 'columnHeader' },
      { text: '(10)', alignment: 'center', style: 'columnHeader' },
      { text: '(80)', alignment: 'center', style: 'columnHeader' },
      { text: '(100)', alignment: 'center', style: 'columnHeader' },
      { text: '', alignment: 'center', style: 'columnHeader' },
      { text: '(10)', alignment: 'center', style: 'columnHeader' },
      { text: '(10)', alignment: 'center', style: 'columnHeader' },
      { text: '(80)', alignment: 'center', style: 'columnHeader' },
      { text: '(100)', alignment: 'center', style: 'columnHeader' },
      { text: '', alignment: 'center', style: 'columnHeader' },
      { text: '(200)', alignment: 'center', style: 'columnHeader' },
      { text: '', alignment: 'center' }
    ],
    ...marks.map((mark: any) => [
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

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 20, 40, 20],
    content: [
      {
        stack: [
          {
            columns: [
              logoData ? {
                width: 70,
                image: logoData,
                alignment: 'center'
              } : {},
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
      // Student details table
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
                        { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                        { text: `Date of Birth: ${studentResult?.student?.birthday ? new Date(studentResult.student.birthday).toLocaleDateString() : '-'}`, style: 'fieldLabel' },
                      ]
                    },
                    studentImageData ? {
                      image: studentImageData,
                      width: 100,
                      height: 100,
                      alignment: 'center',
                      margin: [0, 5],
                    } : {}
                  ]
                }
              ]
            }
          ]]
        },
        layout: 'noBorders'
      },
      // Marks table
      {
        table: {
          headerRows: 3, // Important: Set this to 3 since we have 3 header rows
          widths: ['*', 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 35, 35],
          body: tableBody
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        }
      },
      // Add other content (co-scholastic table, remarks, etc.) similar to PdfGenerator.tsx
    ],
    styles: {
      schoolName: { fontSize: 24, bold: true, alignment: 'center' },
      affiliation: { fontSize: 14, bold: true, alignment: 'center' },
      address: { fontSize: 12, alignment: 'center' },
      reportCardHeader: { fontSize: 14, bold: true },
      fieldLabel: { fontSize: 10, margin: [0, 0, 0, 5] },
      tableHeader: { fontSize: 10, bold: true, alignment: 'center' },
      tableCell: { fontSize: 9, alignment: 'center' }
    }
  };

  return docDefinition;
};

export const generatePdfDefinition9 = (studentResult: any, logoData: string | null, studentImageData: string | null, getOverallGrade: (percentage: number) => string) => {
  const marks = studentResult?.marksSenior || [];

  // Calculate overall results
  let totalObtained = 0;
  let totalPossible = 0;
  
  marks.forEach((mark: any) => {
    if (mark.bestScore && mark.finalExam) {
      totalObtained += (mark.bestScore + mark.finalExam);
      totalPossible += 100;
    }
  });

  const overallPercentage = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(2) : "0";

  // Generate table body with correct data mapping
  const tableBody = [
    [
      { text: 'SUBJECTS', rowSpan: 3, alignment: 'center', style: 'tableHeader' },
      { text: 'Periodic Test', colSpan: 4, alignment: 'center', style: 'tableHeader' },
      {}, {}, {},
      { text: 'Multiple\nAssessment', alignment: 'center', style: 'tableHeader', rowSpan: 2 },
      { text: 'Portfolio &\nSub. Enrichment', alignment: 'center', colSpan: 2, style: 'tableHeader' },
      {},
      { text: 'Best of\nPT+M.A.+\nPortfolio+S.E.\n[E=A+B+C+D]', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
      { text: 'Annual\nExam\n[F]', rowSpan: 2, alignment: 'center', style: 'tableHeader' },
      { text: 'TOTAL\n[E+F]', alignment: 'center', style: 'tableHeader', rowSpan: 2 },
      { text: 'Grade', alignment: 'center', style: 'tableHeader', rowSpan: 2 }
    ],
    [
      {},
      { text: 'PT 1', alignment: 'center', style: 'columnHeader' },
      { text: 'PT 2', alignment: 'center', style: 'columnHeader' },
      { text: 'PT 3', alignment: 'center', style: 'columnHeader' },
      { text: 'Best of\nTwo', alignment: 'center', style: 'columnHeader' },
      {},
      { text: 'Portfolio', alignment: 'center', style: 'columnHeader' },
      { text: 'Sub.\nEnrich', alignment: 'center', style: 'columnHeader' },
      {}, {}, {}, {}
    ],
    [
      {},
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '5', alignment: 'center', style: 'columnHeader' },
      { text: '20', alignment: 'center', style: 'columnHeader' },
      { text: '80', alignment: 'center', style: 'columnHeader' },
      { text: '100', alignment: 'center', style: 'columnHeader' },
      { text: '', alignment: 'center', style: 'columnHeader' }
    ],
    ...marks.map((mark: any) => [
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
      { text: 'TOTAL', colSpan: 10, alignment: 'right', style: 'tableHeader' },
      {}, {}, {}, {}, {}, {}, {}, {}, {},
      { text: totalObtained.toString(), alignment: 'center', style: 'tableHeader' },
      { text: getOverallGrade(Number(overallPercentage)), alignment: 'center', style: 'tableHeader' }
    ],
    [
      { text: `Overall Percentage: ${overallPercentage}%`, colSpan: 12, alignment: 'left', style: 'tableHeader' },
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ]
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20],
    content: [
      // Header
      {
        stack: [
          {
            columns: [
              logoData ? {
                width: 70,
                image: logoData,
                alignment: 'center'
              } : {},
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
      // Student details
      {
        table: {
          widths: ['*'],
          body: [[{
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
                      { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                      { text: `Date of Birth: ${studentResult?.student?.birthday ? new Date(studentResult.student.birthday).toLocaleDateString() : '-'}`, style: 'fieldLabel' },
                    ]
                  },
                  studentImageData ? {
                    image: studentImageData,
                    width: 100,
                    height: 100,
                    alignment: 'center',
                    margin: [0, 5],
                  } : {}
                ]
              }
            ]
          }]]
        },
        layout: 'noBorders'
      },
      // Marks table
      {
        table: {
          headerRows: 3,
          widths: ['*', 25, 25, 25, 25, 30, 25, 25, 30, 30, 30, 25],
          body: tableBody
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        }
      },
      // Grading scale
      {
        text: '\nGrading Scale: A1(91-100%), A2(81-90%), B1(71-80%), B2(61-70%), C1(51-60%), C2(41-50%), D(33-40%), E(Below 33%)',
        style: 'note',
        margin: [0, 10]
      },
      // Signatures
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: 'Class Teacher', alignment: 'center' },
              { text: 'Examination I/C', alignment: 'center' },
              { text: 'Principal', alignment: 'center' }
            ],
            [
              { text: '________________', alignment: 'center' },
              { text: '________________', alignment: 'center' },
              { text: '________________', alignment: 'center' }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 30, 0, 0]
      }
    ],
    styles: {
      schoolName: { fontSize: 24, bold: true },
      affiliation: { fontSize: 14, bold: true },
      address: { fontSize: 12 },
      reportCardHeader: { fontSize: 14, bold: true },
      fieldLabel: { fontSize: 10, margin: [0, 2] },
      tableHeader: { fontSize: 10, bold: true },
      columnHeader: { fontSize: 8, bold: true },
      note: { fontSize: 8, italics: true }
    }
  };

  return docDefinition;
};
