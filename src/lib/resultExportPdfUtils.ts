import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult } from '@/types/result';
import { formatDate } from './utils';
import {
    loadImage,
    getOverallGrade,
    filterLanguageSubjects,
    calculateOverallResults,
    generateTableBody
} from './pdfUtils';

// Re-export loadImage so components can import from this module
export { loadImage };

/**
 * Generates a simplified report card PDF definition — same as the full report card
 * but WITHOUT co-scholastic section, remarks, and signature space.
 */
export const generateResultExportPdfDefinition = (
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
        pageOrientation: 'portrait',
        pageMargins: [15, 10, 15, 10],
        compress: true,
        content: [
            // School header
            {
                stack: [
                    {
                        columns: [
                            {
                                width: 55,
                                image: logoData || '',
                                alignment: 'center'
                            },
                            {
                                stack: [
                                    { text: 'Affiliation No.: 2132869', alignment: 'center', color: 'red', fontSize: 7 },
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
                margin: [0, 0, 0, 3]
            },
            {
                text: `RESULT SHEET (SESSION: ${studentResult?.session?.sessioncode ?? '2023-2024'})`,
                style: 'reportCardHeader',
                alignment: 'center',
                margin: [0, 5, 0, 2]
            },
            {
                text: '(Issued by School as per Directives of Central Board of Secondary Education, Delhi)',
                style: 'subHeader',
                alignment: 'center',
                margin: [0, 0, 0, 5]
            },
            // Student details
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
                                            ]
                                        },
                                        {
                                            width: '30%',
                                            stack: [
                                                { text: `Date of Birth: ${studentResult?.student?.birthday ? formatDate(studentResult.student.birthday) : '-'}`, style: 'fieldLabel' },
                                                { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                                                { text: `Address: ${studentResult?.student?.address ?? '-'}, ${studentResult?.student?.city ?? '-'}`, style: 'fieldLabel' },
                                            ]
                                        },
                                        studentImageData ? {
                                            image: studentImageData || '',
                                            width: 80,
                                            height: 80,
                                            alignment: 'center' as const,
                                            margin: [0, 5] as [number, number],
                                        } : {},
                                    ]
                                }
                            ],
                            margin: [0, 0, 0, 10]
                        }
                    ]]
                },
                layout: 'noBorders'
            },
            // Marks table
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
            // Result row (pass/fail + grading scale) — kept for context
            {
                table: {
                    widths: ['*', '*'],
                    body: [[
                        {
                            text: `Result: ${safeMarksJunior.every(mark =>
                                (mark.grandTotalGrade !== 'F')) ? 'PASSED' : 'FAILED'}`,
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
                margin: [0, 0, 0, 2] as [number, number, number, number]
            },
            // NO co-scholastic section
            // NO remarks section
            // NO signature section
        ],
        styles: {
            schoolName: {
                fontSize: 20,
                bold: true,
                alignment: 'center'
            },
            affiliation: {
                fontSize: 12,
                bold: true,
                alignment: 'center'
            },
            address: {
                fontSize: 10,
                alignment: 'center'
            },
            reportCardHeader: {
                fontSize: 12,
                bold: true
            },
            subHeader: {
                fontSize: 8,
                alignment: 'center'
            },
            columnHeader: {
                fontSize: 8
            },
            fieldLabel: {
                fontSize: 10,
                margin: [0, 0, 0, 2]
            },
            tableHeader: {
                fontSize: 9,
                bold: true,
                alignment: 'center'
            },
            tableCell: {
                fontSize: 8,
                alignment: 'center'
            },
            sectionHeader: {
                fontSize: 10,
                bold: true,
                margin: [0, 2, 0, 2]
            },
            boldValue: {
                fontSize: 11,
                bold: true,
                alignment: 'center',
            }
        }
    };
};

export const generateAndDownloadResultExportPdf = async (
    studentResult: StudentResult,
    logoData: string | null,
    studentImageData: string | null,
    onClose: () => void
) => {
    try {
        const pdfMake = (await import('pdfmake/build/pdfmake')).default;
        const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
        pdfMake.vfs = pdfFonts;

        const docDefinition = generateResultExportPdfDefinition(studentResult, logoData, studentImageData);
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.download(`Result_${studentResult.student.admissionno}.pdf`);

        onClose();
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
