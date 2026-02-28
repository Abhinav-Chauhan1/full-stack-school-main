import { useEffect, useState } from 'react';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult, CoScholasticData } from '@/types/result';
import { formatDate } from './utils';

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
    // Both 30-mark and 40-mark subjects have a maximum total of 50 points
    let maxMarksPerTerm = isFortyMarksSubject ? 50 : isThirtyMarksSubject ? 50 : 100;
    
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

// Helper function to get best score between two unit tests
const getBestUnitTest = (test1: any, test2: any) => {
  if (test1 === null && test2 === null) return '-';
  if (test1 === null) return Math.round(Number(test2));
  if (test2 === null) return Math.round(Number(test1));
  return Math.round(Math.max(Number(test1), Number(test2)));
};

// Helper function to round the sum of notebook and sub enrichment
const roundNBSE = (notebook: number | null, subEnrichment: number | null) => {
  const sum = (notebook ?? 0) + (subEnrichment ?? 0);
  return sum === 0 ? '-' : Math.round(sum);
};

const generateTableBody = (safeMarksJunior: any[], { totalMarks, maxPossibleMarks, overallPercentage}: any) => {
  const totalRow = [
    {},
    {text: `OVER ALL TOTAL (TERM -1 & TERM 2) OF MAIN SUBJECTS`, colSpan: 9, alignment: 'center', style: 'columnHeader' },
    {}, {}, {}, {}, {}, {}, {}, {},
    {},
    {text: `${totalMarks} / ${maxPossibleMarks}`, alignment: 'center', style: 'boldValue' },
    {}
  ];

  const percentageRow = [
    {text: `Over All Percentage:`, colSpan: 2, alignment: 'center', style: 'columnHeader' },{},
    {text: `${overallPercentage}%`, colSpan: 9, alignment: 'left', style: 'boldValue' },
    {}, {}, {}, {}, {}, {}, {}, {},
    {text: `Overall Grade:`, alignment: 'center', style: 'columnHeader' },
    {text: `${getOverallGrade(Number(overallPercentage))}`, alignment: 'center', style: 'boldValue' }
  ];

  // Separate subjects by category
  const regularSubjects = safeMarksJunior.filter(mark => {
    const subject = mark?.classSubject?.subject;
    const isFortyMarksSubject = subject?.code.match(/^(Comp01|GK01|DRAW02)$/);
    const isThirtyMarksSubject = subject?.code.match(/^(Urdu01|SAN01)$/);
    return !isFortyMarksSubject && !isThirtyMarksSubject;
  });

  const fortyMarkSubjects = safeMarksJunior.filter(mark => {
    const subject = mark?.classSubject?.subject;
    return subject?.code.match(/^(Comp01|GK01|DRAW02)$/);
  });

  const thirtyMarkSubjects = safeMarksJunior.filter(mark => {
    const subject = mark?.classSubject?.subject;
    return subject?.code.match(/^(Urdu01|SAN01)$/);
  });

  // Helper to get exam marks based on subject type
  const getExamMarks = (examData: any, isYearly: boolean, isFortyMarksSubject: boolean, isThirtyMarksSubject: boolean) => {
    if (!examData) return '-';
    
    if (isFortyMarksSubject) {
      return isYearly ? examData.yearlyexamMarks40 ?? '-' : examData.examMarks40 ?? '-';
    } else if (isThirtyMarksSubject) {
      return isYearly ? examData.yearlyexamMarks30 ?? '-' : examData.examMarks30 ?? '-';
    }
    return isYearly ? examData.yearlyexamMarks ?? '-' : examData.examMarks ?? '-';
  };

  // Generate rows for regular subjects
  const regularSubjectRows = regularSubjects.map(mark => {
    const bestHalfYearlyUT = getBestUnitTest(mark?.halfYearly?.ut1, mark?.halfYearly?.ut2);
    const yearlyUT = mark?.yearly?.ut3 ?? 0;
    // Convert to number if it's a string, otherwise use 0
    const halfYearlyUTNum = typeof bestHalfYearlyUT === 'string' ? 0 : bestHalfYearlyUT;
    const bestOverallUT = Math.max(halfYearlyUTNum, yearlyUT);
    
    return [
      { text: mark?.classSubject?.subject?.name ?? '-', alignment: 'left' },
      { text: bestHalfYearlyUT, alignment: 'center' },
      { text: roundNBSE(mark?.halfYearly?.noteBook, mark?.halfYearly?.subEnrichment), alignment: 'center' },
      { text: getExamMarks(mark.halfYearly, false, false, false), alignment: 'center' },
      { text: mark?.halfYearly?.totalMarks ?? '-', alignment: 'center' },
      { text: mark?.halfYearly?.grade ?? '-', alignment: 'center' },
      { text: bestOverallUT, alignment: 'center' },
      { text: roundNBSE(mark?.yearly?.yearlynoteBook, mark?.yearly?.yearlysubEnrichment), alignment: 'center' },
      { text: getExamMarks(mark.yearly, true, false, false), alignment: 'center' },
      { text: mark?.yearly?.yearlytotalMarks ?? '-', alignment: 'center' },
      { text: mark?.yearly?.yearlygrade ?? '-', alignment: 'center' },
      { text: mark?.grandTotalMarks ?? '-', alignment: 'center' },
      { text: mark?.grandTotalGrade ?? '-', alignment: 'center' }
    ];
  });

  // Generate rows for 40-mark subjects
  const fortyMarkSubjectRows = fortyMarkSubjects.map(mark => {
    // Get best scores for half-yearly and yearly
    const bestHalfYearlyUT = getBestUnitTest(mark?.halfYearly?.ut1, mark?.halfYearly?.ut2);
    const yearlyUT = mark?.yearly?.ut3 ?? 0;
    // Convert to number if it's a string, otherwise use 0
    const halfYearlyUTNum = typeof bestHalfYearlyUT === 'string' ? 0 : bestHalfYearlyUT;
    const bestOverallUT = Math.max(halfYearlyUTNum, yearlyUT);
    
    // Use the roundNBSE helper function
    const halfYearlyNBSE = roundNBSE(mark?.halfYearly?.noteBook, mark?.halfYearly?.subEnrichment);
    const yearlyNBSE = roundNBSE(mark?.yearly?.yearlynoteBook, mark?.yearly?.yearlysubEnrichment);

    return [
      { text: mark?.classSubject?.subject?.name ?? '-', alignment: 'left' },
      // Show full UT value (not divided by 2)
      { text: bestHalfYearlyUT, alignment: 'center' },
      // Show full NB+SE value (not divided by 2)
      { text: halfYearlyNBSE, alignment: 'center' },
      { text: getExamMarks(mark.halfYearly, false, true, false), alignment: 'center' },
      { text: mark?.halfYearly?.totalMarks ?? '-', alignment: 'center' },
      { text: mark?.halfYearly?.grade ?? '-', alignment: 'center' },
      // Show best overall UT
      { text: bestOverallUT, alignment: 'center' },
      // Show full NB+SE value (not divided by 2)
      { text: yearlyNBSE, alignment: 'center' },
      { text: getExamMarks(mark.yearly, true, true, false), alignment: 'center' },
      { text: mark?.yearly?.yearlytotalMarks ?? '-', alignment: 'center' },
      { text: mark?.yearly?.yearlygrade ?? '-', alignment: 'center' },
      { text: mark?.grandTotalMarks ?? '-', alignment: 'center' },
      { text: mark?.grandTotalGrade ?? '-', alignment: 'center' }
    ];
  });

  // Generate rows for 30-mark subjects
  const thirtyMarkSubjectRows = thirtyMarkSubjects.map(mark => {
    // Get best scores for half-yearly and yearly
    const bestHalfYearlyUT = getBestUnitTest(mark?.halfYearly?.ut1, mark?.halfYearly?.ut2);
    const yearlyUT = mark?.yearly?.ut3 ?? 0;
    // Convert to number if it's a string, otherwise use 0
    const halfYearlyUTNum = typeof bestHalfYearlyUT === 'string' ? 0 : bestHalfYearlyUT;
    const bestOverallUT = Math.max(halfYearlyUTNum, yearlyUT);
    
    return [
      { text: mark?.classSubject?.subject?.name ?? '-', alignment: 'left' },
      { text: bestHalfYearlyUT, alignment: 'center' },
      { text: roundNBSE(mark?.halfYearly?.noteBook, mark?.halfYearly?.subEnrichment), alignment: 'center' },
      { text: getExamMarks(mark.halfYearly, false, false, true), alignment: 'center' },
      { text: mark?.halfYearly?.totalMarks ?? '-', alignment: 'center' },
      { text: mark?.halfYearly?.grade ?? '-', alignment: 'center' },
      { text: bestOverallUT, alignment: 'center' },
      { text: roundNBSE(mark?.yearly?.yearlynoteBook, mark?.yearly?.yearlysubEnrichment), alignment: 'center' },
      { text: getExamMarks(mark.yearly, true, false, true), alignment: 'center' },
      { text: mark?.yearly?.yearlytotalMarks ?? '-', alignment: 'center' },
      { text: mark?.yearly?.yearlygrade ?? '-', alignment: 'center' },
      { text: mark?.grandTotalMarks ?? '-', alignment: 'center' },
      { text: mark?.grandTotalGrade ?? '-', alignment: 'center' }
    ];
  });

  // Create section headers - removing regularSubjectsHeader
  const fortyMarkSubjectsHeader = fortyMarkSubjects.length > 0 ? [
    { text: 'ADDITIONAL SUBJECTS (40 MARKS THEORY | 10 MARKS PRACTICAL)', colSpan: 13, alignment: 'center', style: 'sectionHeader', fillColor: '#f0f0f0' },
    {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
  ] : [];

  const thirtyMarkSubjectsHeader = thirtyMarkSubjects.length > 0 ? [
    { text: 'ADDITIONAL SUBJECTS (30 MARKS THEORY | 20 MARKS PRACTICAL)', colSpan: 13, alignment: 'center', style: 'sectionHeader', fillColor: '#f0f0f0' },
    {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
  ] : [];

  // Build the complete table
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
      { text: 'UT', alignment: 'center', style: 'columnHeader' },
      { text: 'N.B &\nSub\nEnrich', alignment: 'center', style: 'columnHeader' },
      { text: 'H.Y.E', alignment: 'center', style: 'columnHeader' },
      { text: 'M.O', alignment: 'center', style: 'columnHeader' },
      { text: 'GR.', alignment: 'center',rowSpan: 2, style: 'columnHeader' },
      { text: 'UT', alignment: 'center', style: 'columnHeader' },
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
    // First include regular subjects if any - removing the header
    ...(regularSubjects.length > 0 ? regularSubjectRows : []),
    
    // Include forty mark subjects with their header
    ...(fortyMarkSubjects.length > 0 ? [
      fortyMarkSubjectsHeader,
      [
        {},
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(40)', alignment: 'center', style: 'columnHeader' },
        { text: '(50)', alignment: 'center', style: 'columnHeader' },
        {},
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(40)', alignment: 'center', style: 'columnHeader' },
        { text: '(50)', alignment: 'center', style: 'columnHeader' },
        {},
        { text: '(100)', alignment: 'center', style: 'columnHeader' }, 
        {}
      ],
      ...fortyMarkSubjectRows
    ] : []),
    
    // Include thirty mark subjects with their header
    ...(thirtyMarkSubjects.length > 0 ? [
      thirtyMarkSubjectsHeader,
      [
        {},
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(30)', alignment: 'center', style: 'columnHeader' },
        { text: '(50)', alignment: 'center', style: 'columnHeader' },
        {},
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(10)', alignment: 'center', style: 'columnHeader' },
        { text: '(30)', alignment: 'center', style: 'columnHeader' },
        { text: '(50)', alignment: 'center', style: 'columnHeader' },
        {},
        { text: '(100)', alignment: 'center', style: 'columnHeader' }, 
        {}
      ],
      ...thirtyMarkSubjectRows
    ] : []),
    
    totalRow,
    percentageRow
  ];
};

const generateCoScholasticTable = (coScholasticData: any) => {
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
  
  // Find co-scholastic data properly
  let coScholasticData = null;
  
  // First check if any marks have direct co-scholastic data
  for (const mark of safeMarksJunior) {
    if (mark && typeof mark === 'object' && mark.coScholastic) {
      coScholasticData = mark.coScholastic;
      break;
    }
  }
  
  // Generate co-scholastic table with the data we found
  const coScholasticTableData = generateCoScholasticTable(coScholasticData);

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [15, 10, 15, 10], // Reduced margins
    compress: true, // Compress content to fit better
    content: [
      // School header with improved layout
      {
        stack: [
          {
            columns: [
              {
                width: 55, // Slightly smaller logo
                image: logoData || '',
                alignment: 'center'
              },
              {
                stack: [
                  { text: 'Affiliation No.: 2132869', alignment: 'center', color: 'red', fontSize: 7 }, // Smaller font
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
        margin: [0, 0, 0, 3] // Reduced margin
      },
      {
        text: `REPORT CARD (SESSION: ${studentResult?.session?.sessioncode ?? '2023-2024'})`,
        style: 'reportCardHeader',
        alignment: 'center',
        margin: [0, 5, 0, 2] // Reduced margin
      },
      {
        text: '(Issued by School as per Directives of Central Board of Secondary Education, Delhi)',
        style: 'subHeader',
        alignment: 'center',
        margin: [0, 0, 0, 5] // Reduced margin
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
                        { text: `Class: ${studentResult?.student?.Class?.name?.replace('Class ', '')} - (${studentResult?.student?.Section?.name ?? '-'})`, style: 'fieldLabel' },
                        { text: `Mother's Name: ${studentResult?.student?.mothername ?? '-'}`, style: 'fieldLabel' },
                        { text: `Father's Name: ${studentResult?.student?.fathername ?? '-'}`, style: 'fieldLabel' },
                        {text: `School Address: 3K.M, Milestone, Near Garhi, Kanth (Moradabad)`, style: 'fieldLabel' },
                      ]
                    },
                    {
                      width: '30%',
                      stack: [
                        { text: `Date of Birth: ${studentResult?.student?.birthday ? formatDate(studentResult.student.birthday) : '-'}`, style: 'fieldLabel' },
                        { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                        { text: `Address: ${studentResult?.student?.address ?? '-'}, ${studentResult?.student?.city ?? '-'}, ${studentResult?.student?.village ?? '-'}`, style: 'fieldLabel' },
                      ]
                    },
                    studentImageData ?{
                      image: studentImageData || '', // Use the loaded student image
                      width: 80,
                      height: 80,
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
      // Co-scholastic table - make sure it's included and properly structured
      {
        table: coScholasticTableData,
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => 'black',
          vLineColor: () => 'black'
        },
        margin: [0, 10, 0, 10] // Add more margin for separation
      },
      {
        table: {
          widths: ['*', '*'],
          body: [[
            {
              text: `Result: ${safeMarksJunior.every(mark => 
                (mark.grandTotalGrade !== 'F' )) ? 'PASSED' : 'FAILED'}`,
              style: 'tableHeader',
              alignment: 'center'
            },
            {
              text: '8 Point Grading Scale : A1(90% - 100%), A2(80% - 90%), B1(70% - 80%), B2(60% - 70%),C1(50% - 60%), C2(40% - 50%), D(33% - 40%), E(32% - Below)',
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
        margin: [0, 0, 0, 2] // Remove margin
      },
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
        fontSize: 20, // Reduced from 24
        bold: true,
        alignment: 'center'
      },
      affiliation: {
        fontSize: 12, // Reduced from 14
        bold: true,
        alignment: 'center'
      },
      address: {
        fontSize: 10, // Reduced from 12
        alignment: 'center'
      },
      reportCardHeader: {
        fontSize: 12, // Reduced from 14
        bold: true
      },
      subHeader: {
        fontSize: 8, // Reduced from 10
        alignment: 'center'
      },
      columnHeader: {
        fontSize: 8 // Reduced from 9
      },
      fieldLabel: {
        fontSize: 10, // Reduced from 10
        margin: [0, 0, 0, 2] // Reduced margin
      },
      tableHeader: {
        fontSize: 9, // Reduced from 10
        bold: true,
        alignment: 'center'
      },
      tableCell: {
        fontSize: 8, // Reduced from 9
        alignment: 'center'
      },
      sectionHeader: {
        fontSize: 10, // Reduced from 11
        bold: true,
        margin: [0, 2, 0, 2] // Reduced margin
      },
      boldValue: {
        fontSize: 11,
        bold: true,
        alignment: 'center',
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
    
    // Create and download the PDF with fit-to-page options
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    // Configure PDF to scale content to fit page
    pdfDoc.download(`Result_${studentResult.student.admissionno}.pdf`);
    
    onClose();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};