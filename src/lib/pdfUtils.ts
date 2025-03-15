import { useEffect, useState } from 'react';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult } from '@/types/result';

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

// Helper to check if a subject has non-zero marks in any exam
const hasNonZeroMarks = (mark: any) => {
  if (!mark) return false;
  
  // Check half yearly marks
  const halfYearlyExamMarks = 
    mark?.halfYearly?.examMarks || 
    mark?.halfYearly?.examMarks30 || 
    mark?.halfYearly?.examMarks40;
  
  const halfYearlyHasMarks = 
    (mark?.halfYearly?.ut1 > 0) ||
    (mark?.halfYearly?.ut2 > 0) ||
    (mark?.halfYearly?.noteBook > 0) ||
    (mark?.halfYearly?.subEnrichment > 0) ||
    (halfYearlyExamMarks > 0);
  
  // Check yearly marks
  const yearlyExamMarks = 
    mark?.yearly?.yearlyexamMarks || 
    mark?.yearly?.yearlyexamMarks30 || 
    mark?.yearly?.yearlyexamMarks40;
    
  const yearlyHasMarks =
    (mark?.yearly?.ut3 > 0) ||
    (mark?.yearly?.ut4 > 0) ||
    (mark?.yearly?.yearlynoteBook > 0) ||
    (mark?.yearly?.yearlysubEnrichment > 0) ||
    (yearlyExamMarks > 0);
  
  return halfYearlyHasMarks || yearlyHasMarks;
};

// Filter language subjects (SAN01 and Urdu01) to keep only the one with marks
const filterLanguageSubjects = (marks: any[]) => {
  // Find marks for language subjects
  const urduMarks = marks.find(mark => mark?.classSubject?.subject?.code === 'Urdu01');
  const sanskritMarks = marks.find(mark => mark?.classSubject?.subject?.code === 'SAN01');
  
  // If student doesn't have both subjects, return original marks
  if (!urduMarks || !sanskritMarks) {
    return marks;
  }
  
  // Check if each subject has non-zero marks
  const urduHasMarks = hasNonZeroMarks(urduMarks);
  const sanskritHasMarks = hasNonZeroMarks(sanskritMarks);
  
  // If both have marks or neither has marks, return original array
  if ((urduHasMarks && sanskritHasMarks) || (!urduHasMarks && !sanskritHasMarks)) {
    return marks;
  }
  
  // Return filtered array excluding the subject with no marks
  return marks.filter(mark => {
    const subjectCode = mark?.classSubject?.subject?.code;
    
    if (subjectCode === 'Urdu01') {
      return urduHasMarks;
    }
    if (subjectCode === 'SAN01') {
      return sanskritHasMarks;
    }
    
    // Keep all non-language subjects
    return true;
  });
};

const calculateOverallResults = (marks: any[]) => {
  const totals = marks.reduce((acc, mark) => {
    const subject = mark?.classSubject?.subject;
    const isFortyMarksSubject = subject?.code.match(/^(Comp01|GK01|DRAW02)$/);
    const isThirtyMarksSubject = subject?.code.match(/^(Urdu01|SAN01)$/);
    
    // Calculate max marks per term based on subject type
    let maxMarksPerTerm = isFortyMarksSubject ? 50 : isThirtyMarksSubject ? 40 : 100;
    
    const halfYearlyMarks = mark.halfYearly?.totalMarks || 0;
    const yearlyMarks = mark.yearly?.yearlytotalMarks || 0;
    acc.totalMarks += (halfYearlyMarks + yearlyMarks);
    acc.maxPossibleMarks += (maxMarksPerTerm * 2); // multiply by 2 for both terms
    return acc;
  }, { totalMarks: 0, maxPossibleMarks: 0 });

  const overallPercentage = totals.maxPossibleMarks > 0 
    ? Number((totals.totalMarks / totals.maxPossibleMarks * 100).toFixed(2))
    : 0;

  return { ...totals, overallPercentage};
};

const generateTableBody = (safeMarksJunior: any[], { totalMarks, maxPossibleMarks, overallPercentage}: any) => {
  const totalRow = [
    {},
    {text: `OVER ALL TOTAL (TERM -1 & TERM 2) OF MAIN SUBJECTS`, colSpan: 9, alignment: 'center', style: 'columnHeader' },
    {}, {}, {}, {}, {}, {}, {}, {},
    {},
    {text: `${totalMarks} / ${maxPossibleMarks}`, alignment: 'center', style: 'columnHeader' },
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
  return [
    [
      { text: 'SCHOLASTIC\nAREAS', rowSpan: 1, alignment: 'center', style: 'tableHeader' },
      { text: 'TERM - 1 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
      {}, {}, {}, {},
      { text: 'TERM - 2 (100 MARKS)', colSpan: 5, alignment: 'center', style: 'tableHeader' },
      {}, {}, {}, {},
      { colSpan: 2, text: '', alignment: 'center', style: 'tableHeader' },
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
    ...safeMarksJunior.map(mark => {
      const subject = mark?.classSubject?.subject;
      const isFortyMarksSubject = subject?.code.match(/^(Comp01|GK01|DRAW02)$/);
      const isThirtyMarksSubject = subject?.code.match(/^(Urdu01|SAN01)$/);

      // Helper to get exam marks based on subject type
      const getExamMarks = (examData: any, isYearly: boolean) => {
        if (!examData) return '-';
        
        if (isFortyMarksSubject) {
          return isYearly ? examData.yearlyexamMarks40 ?? '-' : examData.examMarks40 ?? '-';
        } else if (isThirtyMarksSubject) {
          return isYearly ? examData.yearlyexamMarks30 ?? '-' : examData.examMarks30 ?? '-';
        }
        return isYearly ? examData.yearlyexamMarks ?? '-' : examData.examMarks ?? '-';
      };

      return [
        { text: mark?.classSubject?.subject?.name ?? '-', alignment: 'left' },
        { text: mark?.halfYearly?.ut1 ?? '-', alignment: 'center' },
        { text: ((mark?.halfYearly?.noteBook ?? 0) + (mark?.halfYearly?.subEnrichment ?? 0)) || '-', alignment: 'center' },
        { text: getExamMarks(mark.halfYearly, false), alignment: 'center' },
        { text: mark?.halfYearly?.totalMarks ?? '-', alignment: 'center' },
        { text: mark?.halfYearly?.grade ?? '-', alignment: 'center' },
        { text: mark?.yearly?.ut3 ?? '-', alignment: 'center' },
        { text: ((mark?.yearly?.yearlynoteBook ?? 0) + (mark?.yearly?.yearlysubEnrichment ?? 0)) || '-', alignment: 'center' },
        { text: getExamMarks(mark.yearly, true), alignment: 'center' },
        { text: mark?.yearly?.yearlytotalMarks ?? '-', alignment: 'center' },
        { text: mark?.yearly?.yearlygrade ?? '-', alignment: 'center' },
        { text: mark?.grandTotalMarks ?? '-', alignment: 'center' },
        { text: mark?.grandTotalGrade ?? '-', alignment: 'center' }
      ];
    }),
    totalRow,
    percentageRow
  ];
};

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

export const generatePdfDefinition = (
  studentResult: StudentResult,
  logoData: string | null,
  studentImageData: string | null
): TDocumentDefinitions => {
  if (!studentResult) {
    throw new Error('Student result is required');
  }

  const safeMarksJunior = studentResult?.marksJunior ?? [];
  
  // Filter language subjects to only include those with marks
  const filteredMarks = filterLanguageSubjects(safeMarksJunior);
  
  const results = calculateOverallResults(filteredMarks);
  const tableBody = generateTableBody(filteredMarks, results);

  return {
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
                (mark.grandTotalGrade !== 'F' )) ? 'PASSED' : 'FAILED'}`,
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
};

export const generateAndDownloadPdf = async (
  studentResult: StudentResult,
  logoData: string | null,
  studentImageData: string | null,
  onClose: () => void
) => {
  try {
    // Dynamically import pdfMake
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
    pdfMake.vfs = pdfFonts;

    const docDefinition = generatePdfDefinition(studentResult, logoData, studentImageData);
    
    // Create and download the PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(`Result_${studentResult.student.admissionno}.pdf`);
    
    onClose();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};