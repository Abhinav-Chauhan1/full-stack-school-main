import { TDocumentDefinitions } from 'pdfmake/interfaces';

const getOverallGrade = (pct: number) => {
    if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D'; return 'E';
};

const fmt = (v: any) => { if (v === -1) return 'AB'; return v ?? '-'; };

export const generateClass11ResultPdfDefinition = (
    sessionCode: string,
    className: string,
    sectionName: string,
    students: any[]
): TDocumentDefinitions => {
    const content: any[] = [
        { text: 'Class 11 Result Detailed Summary', style: 'header', alignment: 'center', margin: [0, 0, 0, 8] },
        {
            columns: [
                { text: `Session: ${sessionCode}`, style: 'subheader' },
                { text: `Class: ${className}`, style: 'subheader', alignment: 'center' },
                { text: `Section: ${sectionName}`, style: 'subheader', alignment: 'right' },
            ],
            margin: [0, 0, 0, 8],
        },
    ];

    students.forEach((studentResult: any, index: number) => {
        const marks: any[] = studentResult.marksHigher ?? [];
        const regularMarks = marks.filter(m => m.sectionSubject?.subject?.code !== 'PAI02');
        const paintingMark = marks.find(m => m.sectionSubject?.subject?.code === 'PAI02');

        let totalObtained = 0, totalMax = 0;
        for (const m of regularMarks) {
            if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
        }
        if (paintingMark) {
            const t = (paintingMark.theory30 || 0) + (paintingMark.practical70 || 0);
            if (t > 0) { totalObtained += t; totalMax += 100; }
        }
        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;

        const subjectRows = regularMarks.map((m: any) => [
            { text: m.sectionSubject?.subject?.name ?? '-', style: 'tableCellText' },
            { text: fmt(m.unitTest1), style: 'tableCell' },
            { text: fmt(m.halfYearly), style: 'tableCell' },
            { text: fmt(m.unitTest2), style: 'tableCell' },
            { text: fmt(m.theory), style: 'tableCell' },
            { text: fmt(m.practical), style: 'tableCell' },
            { text: fmt(m.grandTotal), style: 'tableCell', bold: true },
            { text: m.grade ?? '-', style: 'tableCell', bold: true },
        ]);

        const paintingRow = paintingMark ? [[
            { text: `${paintingMark.sectionSubject?.subject?.name ?? 'Painting'} (Additional)`, style: 'tableCellText', fillColor: '#faf5ff' },
            { text: 'Theory /30', colSpan: 2, style: 'tableCell', color: '#6b7280', fillColor: '#faf5ff' }, {},
            { text: fmt(paintingMark.theory30), style: 'tableCell', fillColor: '#faf5ff' },
            { text: 'Practical /70', style: 'tableCell', color: '#6b7280', fillColor: '#faf5ff' },
            { text: fmt(paintingMark.practical70), style: 'tableCell', fillColor: '#faf5ff' },
            { text: fmt((paintingMark.theory30 || 0) + (paintingMark.practical70 || 0)), style: 'tableCell', bold: true, fillColor: '#faf5ff' },
            { text: paintingMark.grade ?? '-', style: 'tableCell', bold: true, fillColor: '#faf5ff' },
        ]] : [];

        // 8 columns (0-7)
        const totalRow = [
            { text: 'OVER ALL TOTAL (MAIN SUBJECTS)', colSpan: 5, alignment: 'center', style: 'summaryLabel', fillColor: '#f0fdf4' },
            {}, {}, {}, {},
            { text: `${totalObtained} / ${totalMax}`, colSpan: 2, alignment: 'center', style: 'summaryValue', fillColor: '#f0fdf4' }, {},
            { text: '', fillColor: '#f0fdf4' },
        ];
        const pctRow = [
            { text: 'Over All Percentage:', colSpan: 2, alignment: 'center', style: 'summaryLabel', fillColor: '#eff6ff' }, {},
            { text: `${pct}%`, colSpan: 3, alignment: 'left', style: 'summaryValue', fillColor: '#eff6ff' }, {}, {},
            { text: 'Overall Grade:', alignment: 'center', style: 'summaryLabel', fillColor: '#eff6ff' },
            { text: getOverallGrade(pct), colSpan: 2, alignment: 'center', style: 'summaryValue', fillColor: '#eff6ff' }, {},
        ];

        const tableBody = [
            [
                { text: 'Subject', rowSpan: 2, style: 'tableHeader', alignment: 'left', fillColor: '#eff6ff' },
                { text: 'Unit Test 1', style: 'subTableHeader', fillColor: '#dbeafe' },
                { text: 'Half Yearly', style: 'subTableHeader', fillColor: '#dbeafe' },
                { text: 'Unit Test 2', style: 'subTableHeader', fillColor: '#dbeafe' },
                { text: 'Theory', style: 'subTableHeader', fillColor: '#dcfce7' },
                { text: 'Practical', style: 'subTableHeader', fillColor: '#dcfce7' },
                { text: 'Grand Total', style: 'subTableHeader', bold: true, fillColor: '#fefce8' },
                { text: 'Grade', style: 'subTableHeader', bold: true, fillColor: '#fefce8' },
            ],
            [
                {},
                { text: '/10', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/30', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/10', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/30', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/20', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/100', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af', bold: true },
                { text: '', style: 'subTableHeader', fillColor: '#f9fafb' },
            ],
            ...subjectRows,
            ...paintingRow,
            totalRow,
            pctRow,
        ];

        content.push({
            unbreakable: true,
            pageBreak: index > 0 && index % 4 === 0 ? 'before' : undefined,
            margin: [0, 0, 0, 15],
            stack: [
                {
                    table: {
                        widths: ['*', 80, '*'],
                        body: [[
                            { stack: [{ text: `Name: ${studentResult.student?.name ?? '-'}`, style: 'infoBlockText', bold: true }, { text: `Adm No: ${studentResult.student?.admissionno ?? '-'}`, style: 'infoBlockText' }], border: [false, false, false, false] },
                            { stack: [{ text: `Class: ${studentResult.student?.Class?.name?.replace('Class ', '')} - ${studentResult.student?.Section?.name ?? '-'}`, style: 'infoBlockText' }], border: [false, false, false, false] },
                            { stack: [{ text: `Father: ${studentResult.student?.fathername ?? '-'}`, style: 'infoBlockText' }, { text: `Mother: ${studentResult.student?.mothername ?? '-'}`, style: 'infoBlockText' }], border: [false, false, false, false] },
                        ]],
                    },
                    margin: [0, 0, 0, 2],
                },
                {
                    table: {
                        headerRows: 2,
                        widths: ['*', 45, 45, 45, 45, 45, 50, 35],
                        body: tableBody,
                    },
                    layout: { paddingLeft: () => 1, paddingRight: () => 1, paddingTop: () => 2, paddingBottom: () => 2, hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e5e7eb', vLineColor: () => '#e5e7eb' },
                },
            ],
        });
    });

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [20, 20, 20, 20],
        compress: true,
        content,
        styles: {
            header: { fontSize: 14, bold: true },
            subheader: { fontSize: 10, color: '#4b5563' },
            infoBlockText: { fontSize: 8, margin: [0, 1, 0, 1] },
            tableHeader: { fontSize: 8, bold: true, alignment: 'center', margin: [0, 2, 0, 2] },
            subTableHeader: { fontSize: 7, color: '#374151', alignment: 'center' },
            tableCell: { fontSize: 8, alignment: 'center' },
            tableCellText: { fontSize: 8, alignment: 'left', margin: [2, 0, 0, 0] },
            summaryLabel: { fontSize: 7, bold: true, alignment: 'center', color: '#1e3a5f' },
            summaryValue: { fontSize: 8, bold: true, alignment: 'center', color: '#1e3a5f' },
        },
        defaultStyle: { font: 'Roboto' },
    };
};

export const generateAndDownloadClass11ResultPdf = async (
    sessionCode: string, className: string, sectionName: string, students: any[]
) => {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
    pdfMake.vfs = pdfFonts;
    const doc = generateClass11ResultPdfDefinition(sessionCode, className, sectionName, students);
    pdfMake.createPdf(doc).download(`Class_${className}_${sectionName}_Results_${sessionCode}.pdf`);
};
