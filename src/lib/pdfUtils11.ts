import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult11 } from '@/types/result';

export { loadImage } from './pdfUtils';

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

const calculateOverallResults = (marks: StudentResult11['marksHigher']) => {
  let totalObtained = 0;
  let totalMarks = 0;

  marks.forEach(mark => {
    if (mark.grandTotal) {
      totalObtained += mark.grandTotal;
      totalMarks += 100; // Each subject is out of 100
    }
  });

  const overallPercentage = totalMarks > 0 ? 
    Number((totalObtained / totalMarks * 100).toFixed(2)) : 0;

  return { totalObtained, totalMarks, overallPercentage };
};

const generateHigherClassesTableBody = (marks: StudentResult11['marksHigher'], totalObtained: number, totalMarks: number, overallPercentage: number) => {
  return [
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
    ...marks.map(mark => [
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
};

const generateHeader = (logoData: string | null, studentResult: StudentResult11) => {
  return {
    stack: [{
      columns: [{
        width: 80,
        image: logoData || '',
        alignment: 'center'
      }, {
        width: '*',
        stack: [
          { text: 'Affiliation No.: 2132850', alignment: 'center', color: 'red', fontSize: 8 },
          { text: 'HOWARD CONVENT SCHOOL', style: 'schoolName', color: '#000080' },
          { text: 'Affiliated To C.B.S.E. New Delhi', style: 'affiliation', color: 'red' },
          { text: 'Near Garhi, Dhampur Road, Kanth (Moradabad)', style: 'address' }
        ],
        alignment: 'center'
      }]
    }],
    margin: [0, 10, 0, 10]
  } as import('pdfmake/interfaces').ContentStack;
};

const generateStudentInfo = (studentResult: StudentResult11, studentImageData: string | null) => {
  return {
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
      }]]
    },
    layout: 'noBorders'
  };
};

export const generatePdfDefinition11 = (
  studentResult: StudentResult11,
  logoData: string | null,
  studentImageData: string | null
): TDocumentDefinitions => {
  if (!studentResult) {
    throw new Error('Student result is required');
  }

  const safeMarksHigher = studentResult?.marksHigher ?? [];
  const { totalObtained, totalMarks, overallPercentage } = calculateOverallResults(safeMarksHigher);
  const tableBody = generateHigherClassesTableBody(safeMarksHigher, totalObtained, totalMarks, overallPercentage);
  const grade = getOverallGrade(overallPercentage);

  return {
    pageSize: 'A4',
    pageMargins: [40, 20, 40, 20],
    content: [
      generateHeader(logoData, studentResult),
      generateStudentInfo(studentResult, studentImageData),
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
            ['Activities', { text: 'Grade', alignment: 'center' }],
            ['Physical Education', { text: 'A', alignment: 'center' }],
            ['Work Experience', { text: 'A', alignment: 'center' }],
            ['Discipline', { text: 'A', alignment: 'center' }]
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
          body: [[{
            text: 'Grading Scale : A1(91-100%), A2(81-90%), B1(71-80%), B2(61-70%), C1(51-60%), C2(41-50%), D(33-40%), E(Below 33%)',
            style: 'gradingScale',
            alignment: 'center'
          }]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        },
        margin: [0, 10]
      },
      // Result and Remarks
      {
        columns: [
          {
            width: '50%',
            table: {
              widths: ['*'],
              body: [[{
                text: `Result: ${Number(overallPercentage) >= 33 ? 'PASSED' : 'FAILED'}`,
                style: 'tableHeader',
                alignment: 'center'
              }]]
            }
          },
          {
            width: '50%',
            table: {
              widths: ['*'],
              body: [[{
                text: `Teacher Remarks: ${safeMarksHigher[0]?.remarks || 'Good'}`,
                style: 'tableHeader',
                alignment: 'center'
              }]]
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
        bold: true,
        alignment: 'center'
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
};

export const generateAndDownloadPdf11 = async (
  studentResult: StudentResult11,
  logoData: string | null,
  studentImageData: string | null,
  onClose: () => void
) => {
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
    pdfMake.vfs = pdfFonts;

    const docDefinition = generatePdfDefinition11(studentResult, logoData, studentImageData);
    
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(`Result_${studentResult.student.admissionno}_Class11.pdf`);
    
    onClose();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
