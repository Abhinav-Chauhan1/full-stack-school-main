import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult } from '@/types/result';
import { formatDate } from './utils';

// Helper for calculating best UT
const getBestUnitTest = (ut1: number | null | undefined, ut2: number | null | undefined): number | string => {
    if (ut1 === null && ut2 === null) return '-';
    if (ut1 === undefined && ut2 === undefined) return '-';
    return Math.max(ut1 || 0, ut2 || 0);
};

export const generateClassResultPdfDefinition = (
    sessionCode: string,
    className: string,
    sectionName: string,
    students: StudentResult[]
): TDocumentDefinitions => {

    const content: any[] = [
        {
            text: `Class Result Detailed Summary`,
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 8]
        },
        {
            columns: [
                { text: `Session: ${sessionCode}`, style: 'subheader' },
                { text: `Class: ${className}`, style: 'subheader', alignment: 'center' },
                { text: `Section: ${sectionName}`, style: 'subheader', alignment: 'right' }
            ],
            margin: [0, 0, 0, 8]
        }
    ];

    students.forEach((studentResult, index) => {
        const safeMarksJunior = studentResult?.marksJunior ?? [];

        // Separate subjects by category
        const regularSubjects = safeMarksJunior.filter(mark => {
            const subject = mark?.classSubject?.subject;
            const isFortyMarksSubject = false;
            const isThirtyMarksSubject = subject?.code.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
            return !isFortyMarksSubject && !isThirtyMarksSubject;
        });

        const thirtyMarkSubjects = safeMarksJunior.filter(mark => {
            const subject = mark?.classSubject?.subject;
            return subject?.code.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
        });

        // Map over all subjects
        const generateRows = (marksArray: any[], isThirty: boolean) => {
            return marksArray.map(mark => {
                const subjectName = mark?.classSubject?.subject?.name ?? '-';

                // Format helper for marks
                const formatMark = (markValue: any) => {
                    if (markValue === -1) return 'AB';
                    return markValue ?? '-';
                };

                // Term 1
                const t1_ut1 = formatMark(mark?.halfYearly?.ut1);
                const t1_ut2 = formatMark(mark?.halfYearly?.ut2);
                const t1_nb = formatMark(mark?.halfYearly?.noteBook);
                const t1_sub = formatMark(mark?.halfYearly?.subEnrichment);
                const t1_hye = isThirty ? formatMark(mark?.halfYearly?.examMarks30) : formatMark(mark?.halfYearly?.examMarks);
                const t1_total = formatMark(mark?.halfYearly?.totalMarks);

                // Term 2
                const t2_ut3 = formatMark(mark?.yearly?.ut3);
                const t2_nb = formatMark(mark?.yearly?.yearlynoteBook);
                const t2_sub = formatMark(mark?.yearly?.yearlysubEnrichment);
                const t2_ye = isThirty ? formatMark(mark?.yearly?.yearlyexamMarks30) : formatMark(mark?.yearly?.yearlyexamMarks);
                const t2_total = formatMark(mark?.yearly?.yearlytotalMarks);

                // Overall
                const grandTotal = mark?.grandTotalMarks ?? '-';
                const grade = mark?.grandTotalGrade ?? '-';

                return [
                    { text: subjectName, alignment: 'left', style: 'tableCellText' },
                    { text: t1_ut1, style: 'tableCell' },
                    { text: t1_ut2, style: 'tableCell' },
                    { text: t1_nb, style: 'tableCell' },
                    { text: t1_sub, style: 'tableCell' },
                    { text: t1_hye, style: 'tableCell' },
                    { text: t1_total, style: 'tableCell', bold: true },
                    { text: t2_ut3, style: 'tableCell' },
                    { text: t2_nb, style: 'tableCell' },
                    { text: t2_sub, style: 'tableCell' },
                    { text: t2_ye, style: 'tableCell' },
                    { text: t2_total, style: 'tableCell', bold: true },
                    { text: grandTotal, style: 'tableCell', bold: true },
                    { text: grade, style: 'tableCell', bold: true },
                ];
            });
        };

        const tableBody = [
            // Row 1: Headers
            [
                { text: 'Subject', rowSpan: 2, style: 'tableHeader', alignment: 'left', fillColor: '#eff6ff' }, // bg-blue-50
                { text: 'TERM 1', colSpan: 6, style: 'tableHeader', fillColor: '#dbeafe' }, // bg-blue-100
                {}, {}, {}, {}, {},
                { text: 'TERM 2', colSpan: 5, style: 'tableHeader', fillColor: '#dcfce7' }, // bg-green-100
                {}, {}, {}, {},
                { text: 'Overall', colSpan: 2, style: 'tableHeader', fillColor: '#fefce8' }, // bg-yellow-50
                {}
            ],
            // Row 2: Sub-headers
            [
                {},
                { text: 'UT1', style: 'subTableHeader', fillColor: '#f9fafb' }, // bg-gray-50
                { text: 'UT2', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'NB', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Sub Enr', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'HYE', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Total', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' },
                { text: 'UT3', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'NB', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Sub Enr', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'YE', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Total', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' },
                { text: 'Grand', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' },
                { text: 'Grade', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' }
            ],
            ...generateRows(regularSubjects, false),
            ...(thirtyMarkSubjects.length > 0 ? [
                [
                    { text: '', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(10)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(10)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(5)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(5)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(30)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(50)', style: 'subTableHeader', fillColor: '#f9fafb', bold: true },
                    { text: '(10)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(5)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(5)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(30)', style: 'subTableHeader', fillColor: '#f9fafb' },
                    { text: '(50)', style: 'subTableHeader', fillColor: '#f9fafb', bold: true },
                    { text: '(100)', style: 'subTableHeader', fillColor: '#f9fafb', bold: true },
                    { text: '', style: 'subTableHeader', fillColor: '#f9fafb' }
                ],
                ...generateRows(thirtyMarkSubjects, true)
            ] : []),
        ];

        // Break every 3 students (0, 1, 2 => break at 3, 6, 9)
        const breakPage = index > 0 && index % 3 === 0 ? 'before' : undefined;

        content.push({
            unbreakable: true, // Keep a student's block on one page if possible
            pageBreak: breakPage,
            margin: [0, 0, 0, 15],
            stack: [
                // Student info block
                {
                    table: {
                        widths: ['*', 120, '*'],
                        body: [[
                            {
                                stack: [
                                    { text: `Name: ${studentResult?.student?.name ?? '-'}`, style: 'infoBlockText', bold: true },
                                    { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'infoBlockText' },
                                    { text: `DOB: ${studentResult?.student?.birthday ? formatDate(studentResult.student.birthday) : '-'}`, style: 'infoBlockText' },
                                ],
                                border: [false, false, false, false]
                            },
                            {
                                stack: [
                                    { text: `Class: ${studentResult?.student?.Class?.name?.replace('Class ', '')} - ${studentResult?.student?.Section?.name ?? '-'}`, style: 'infoBlockText' },
                                ],
                                border: [false, false, false, false]
                            },
                            {
                                stack: [
                                    { text: `Father: ${studentResult?.student?.fathername ?? '-'}`, style: 'infoBlockText' },
                                    { text: `Mother: ${studentResult?.student?.mothername ?? '-'}`, style: 'infoBlockText' },
                                ],
                                border: [false, false, false, false]
                            }
                        ]]
                    },
                    margin: [0, 0, 0, 2]
                },
                // Marks table
                {
                    table: {
                        headerRows: 2,
                        widths: ['*', 18, 18, 18, 26, 22, 22, 18, 18, 26, 22, 22, 26, 26],
                        body: tableBody,
                    },
                    layout: {
                        paddingLeft: () => 1,
                        paddingRight: () => 1,
                        paddingTop: () => 2,
                        paddingBottom: () => 2,
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#e5e7eb', // tailwind gray-200
                        vLineColor: () => '#e5e7eb',
                    }
                }
            ]
        });
    });

    if (students.length === 0) {
        content.push({
            text: 'No students found.',
            alignment: 'center',
            margin: [0, 20, 0, 0]
        });
    }

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [20, 20, 20, 20],
        compress: true,
        content: content,
        styles: {
            header: {
                fontSize: 14,
                bold: true
            },
            subheader: {
                fontSize: 10,
                color: '#4b5563' // gray-600
            },
            infoBlockText: {
                fontSize: 8,
                margin: [0, 1, 0, 1]
            },
            tableHeader: {
                fontSize: 8,
                bold: true,
                alignment: 'center',
                margin: [0, 2, 0, 2]
            },
            subTableHeader: {
                fontSize: 7,
                color: '#374151', // gray-700
                alignment: 'center',
            },
            tableCell: {
                fontSize: 8,
                alignment: 'center'
            },
            tableCellText: {
                fontSize: 8,
                alignment: 'left',
                margin: [2, 0, 0, 0]
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };
};

export const generateAndDownloadClassResultPdf = async (
    sessionCode: string,
    className: string,
    sectionName: string,
    students: StudentResult[]
) => {
    try {
        const pdfMake = (await import('pdfmake/build/pdfmake')).default;
        const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
        pdfMake.vfs = pdfFonts;

        const docDefinition = generateClassResultPdfDefinition(sessionCode, className, sectionName, students);
        const pdfDoc = pdfMake.createPdf(docDefinition);

        const safeClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
        const safeSectionName = sectionName.replace(/[^a-zA-Z0-9]/g, '_');
        pdfDoc.download(`Class_${safeClassName}_${safeSectionName}_Detailed_Results_${sessionCode}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
