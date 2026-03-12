import { TDocumentDefinitions } from 'pdfmake/interfaces';

interface StudentSummary {
    sno: number;
    name: string;
    admNo: string;
    totalMarks: number;
    percentage: number;
    grade: string;
    status: string;
}

export const generateClassResultPdfDefinition = (
    sessionCode: string,
    className: string,
    sectionName: string,
    students: StudentSummary[]
): TDocumentDefinitions => {
    const tableBody: any[][] = [
        [
            { text: 'S.No.', style: 'tableHeader' },
            { text: 'Student Name', style: 'tableHeader' },
            { text: 'Adm No', style: 'tableHeader' },
            { text: 'Total Marks', style: 'tableHeader' },
            { text: 'Percentage (%)', style: 'tableHeader' },
            { text: 'Overall Grade', style: 'tableHeader' },
            { text: 'Status', style: 'tableHeader' }
        ]
    ];

    students.forEach((student) => {
        tableBody.push([
            { text: student.sno.toString(), style: 'tableCell', alignment: 'center' },
            { text: student.name, style: 'tableCell' },
            { text: student.admNo || '-', style: 'tableCell', alignment: 'center' },
            { text: student.totalMarks.toString(), style: 'tableCell', alignment: 'center' },
            { text: student.percentage.toFixed(2), style: 'tableCell', alignment: 'center' },
            { text: student.grade, style: 'tableCell', alignment: 'center' },
            { text: student.status, style: 'tableCell', alignment: 'center', color: student.status === 'PASSED' ? 'green' : 'red' }
        ]);
    });

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [30, 40, 30, 40],
        content: [
            {
                text: 'Class Result Summary',
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
            },
            {
                table: {
                    headerRows: 1,
                    widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: {
                    fillColor: function (rowIndex) {
                        return (rowIndex === 0) ? '#f2f2f2' : null;
                    },
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#bfbfbf',
                    vLineColor: () => '#bfbfbf'
                }
            }
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true
            },
            subheader: {
                fontSize: 12,
                bold: true
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: 'black',
                alignment: 'center',
                margin: [0, 5, 0, 5]
            },
            tableCell: {
                fontSize: 10,
                margin: [0, 5, 0, 5]
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
    students: StudentSummary[]
) => {
    try {
        const pdfMake = (await import('pdfmake/build/pdfmake')).default;
        const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
        pdfMake.vfs = pdfFonts;

        // By default pdfmake uses Roboto. The vfs_fonts supplies Roboto.
        const docDefinition = generateClassResultPdfDefinition(sessionCode, className, sectionName, students);
        const pdfDoc = pdfMake.createPdf(docDefinition);

        // Format filename like "Class_5_A_Results_2023-2024.pdf"
        const safeClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
        const safeSectionName = sectionName.replace(/[^a-zA-Z0-9]/g, '_');
        pdfDoc.download(`Class_${safeClassName}_${safeSectionName}_Results_${sessionCode}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
