import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StudentResult } from '@/types/result';
import { formatDate } from './utils';
import {
    filterLanguageSubjects,
    calculateOverallResults,
    generateTableBody
} from './pdfUtils';

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
            margin: [0, 0, 0, 10]
        },
        {
            columns: [
                { text: `Session: ${sessionCode}`, style: 'subheader' },
                { text: `Class: ${className}`, style: 'subheader', alignment: 'center' },
                { text: `Section: ${sectionName}`, style: 'subheader', alignment: 'right' }
            ],
            margin: [0, 0, 0, 20]
        }
    ];

    students.forEach((studentResult, index) => {
        const safeMarksJunior = studentResult?.marksJunior ?? [];
        const filteredMarks = filterLanguageSubjects(safeMarksJunior);
        const results = calculateOverallResults(filteredMarks);
        const tableBody = generateTableBody(filteredMarks, results);

        // Optional page break to avoid mid-table cuts, splitting into pairs so we get 2 or 3 per page depending on size
        const pageBreakFlag = index > 0 && index % 2 === 0 ? 'before' : undefined;

        // Add student Header
        content.push({
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
                                            { text: `Student Name: ${studentResult?.student?.name ?? '-'}`, style: 'fieldLabel' },
                                            { text: `Class: ${studentResult?.student?.Class?.name?.replace('Class ', '')} - (${studentResult?.student?.Section?.name ?? '-'})`, style: 'fieldLabel' },
                                            { text: `Mother's Name: ${studentResult?.student?.mothername ?? '-'}`, style: 'fieldLabel' },
                                            { text: `Father's Name: ${studentResult?.student?.fathername ?? '-'}`, style: 'fieldLabel' },
                                        ]
                                    },
                                    {
                                        width: '50%',
                                        stack: [
                                            { text: `Date of Birth: ${studentResult?.student?.birthday ? formatDate(studentResult.student.birthday) : '-'}`, style: 'fieldLabel' },
                                            { text: `Admission No: ${studentResult?.student?.admissionno ?? '-'}`, style: 'fieldLabel' },
                                            { text: `Address: ${studentResult?.student?.address ?? '-'}, ${studentResult?.student?.city ?? '-'}`, style: 'fieldLabel' },
                                        ]
                                    }
                                ]
                            }
                        ],
                        margin: [0, 0, 0, 5]
                    }
                ]]
            },
            layout: 'noBorders',
            pageBreak: pageBreakFlag,
        });

        // Add Marks Table
        content.push({
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
            },
            margin: [0, 0, 0, 20] // Space after each student
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
        pageMargins: [15, 15, 15, 15],
        compress: true,
        content: content,
        styles: {
            header: {
                fontSize: 18,
                bold: true
            },
            subheader: {
                fontSize: 12,
                bold: true
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
