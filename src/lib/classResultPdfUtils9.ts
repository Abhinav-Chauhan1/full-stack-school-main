import { TDocumentDefinitions } from 'pdfmake/interfaces';

const getOverallGrade = (pct: number) => {
    if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D'; return 'E';
};

const fmt = (v: any): string => {
    if (v === null || v === undefined) return '-';
    if (v === -1) return 'AB';
    return String(v);
};

export const generateClass9ResultPdfDefinition = (
    sessionCode: string,
    className: string,
    sectionName: string,
    students: any[]
): TDocumentDefinitions => {
    const content: any[] = [
        { text: 'Class 9 Result Detailed Summary', style: 'header', alignment: 'center', margin: [0, 0, 0, 8] },
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
        const marks: any[] = studentResult.marksSenior ?? [];
        const regularMarks = marks.filter(m => m.sectionSubject?.subject?.code !== 'IT001');
        const itMark = marks.find(m => m.sectionSubject?.subject?.code === 'IT001');

        let totalObtained = 0, totalMax = 0;
        for (const m of regularMarks) {
            if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
        }
        if (itMark?.total != null) { totalObtained += itMark.total; totalMax += 100; }
        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;

        const subjectRows = regularMarks.map((m: any) => [
            { text: m.sectionSubject?.subject?.name ?? '-', style: 'tableCellText' },
            { text: fmt(m.pt1), style: 'tableCell' },
            { text: fmt(m.pt2), style: 'tableCell' },
            { text: fmt(m.pt3), style: 'tableCell' },
            { text: fmt(m.bestTwoPTAvg), style: 'tableCell' },
            { text: fmt(m.multipleAssessment), style: 'tableCell' },
            { text: fmt(m.portfolio), style: 'tableCell' },
            { text: fmt(m.subEnrichment), style: 'tableCell' },
            { text: fmt(m.bestScore), style: 'tableCell' },
            { text: fmt(m.finalExam), style: 'tableCell' },
            { text: fmt(m.grandTotal), style: 'tableCell', bold: true },
            { text: m.grade ?? '-', style: 'tableCell', bold: true },
        ]);

        const itRow = itMark ? [[
            { text: 'Vocational (I.T.)', colSpan: 3, style: 'tableCellText' }, {}, {},
            { text: 'Theory /70', colSpan: 3, style: 'tableCell', color: '#6b7280' }, {}, {},
            { text: fmt(itMark.theory), colSpan: 2, style: 'tableCell' }, {},
            { text: 'Practical /30', style: 'tableCell', color: '#6b7280' },
            { text: fmt(itMark.practical), style: 'tableCell' },
            { text: fmt(itMark.total), style: 'tableCell', bold: true },
            { text: itMark.grade ?? '-', style: 'tableCell', bold: true },
        ]] : [];

        const totalRow = [
            { text: 'OVER ALL TOTAL (MAIN SUBJECTS)', colSpan: 9, alignment: 'center', style: 'summaryLabel', fillColor: '#f0fdf4' },
            {}, {}, {}, {}, {}, {}, {}, {},
            { text: `${totalObtained} / ${totalMax}`, colSpan: 2, alignment: 'center', style: 'summaryValue', fillColor: '#f0fdf4' }, {},
            { text: '', fillColor: '#f0fdf4' },
        ];
        const pctRow = [
            { text: 'Over All Percentage:', colSpan: 2, alignment: 'center', style: 'summaryLabel', fillColor: '#eff6ff' }, {},
            { text: `${pct}%`, colSpan: 7, alignment: 'left', style: 'summaryValue', fillColor: '#eff6ff' },
            {}, {}, {}, {}, {}, {}, {},
            { text: 'Overall Grade:', alignment: 'center', style: 'summaryLabel', fillColor: '#eff6ff' },
            { text: getOverallGrade(pct), colSpan: 2, alignment: 'center', style: 'summaryValue', fillColor: '#eff6ff' }, {},
        ];

        const tableBody = [
            [
                { text: 'Subject', rowSpan: 2, style: 'tableHeader', alignment: 'left', fillColor: '#eff6ff' },
                { text: 'PT1', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'PT2', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'PT3', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Best PT Avg', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'M.A.', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Portfolio', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'S.E.', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Best Score', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Final Exam', style: 'subTableHeader', fillColor: '#f9fafb' },
                { text: 'Grand Total', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' },
                { text: 'Grade', style: 'subTableHeader', bold: true, fillColor: '#f9fafb' },
            ],
            [
                {},
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/5', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/20', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/80', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af' },
                { text: '/100', style: 'subTableHeader', fillColor: '#f9fafb', color: '#9ca3af', bold: true },
                { text: '', style: 'subTableHeader', fillColor: '#f9fafb' },
            ],
            ...subjectRows,
            ...itRow,
            totalRow,
            pctRow,
        ];

        content.push({
            unbreakable: true,
            pageBreak: index > 0 && index % 3 === 0 ? 'before' : undefined,
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
                        widths: ['*', 20, 20, 20, 30, 22, 28, 20, 28, 28, 30, 22],
                        body: tableBody,
                    },
                    layout: { paddingLeft: () => 1, paddingRight: () => 1, paddingTop: () => 2, paddingBottom: () => 2, hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e5e7eb', vLineColor: () => '#e5e7eb' },
                },
            ],
        });
    });

    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [15, 15, 15, 15],
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

export const generateAndDownloadClass9ResultPdf = async (
    sessionCode: string, className: string, sectionName: string, students: any[]
) => {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
    pdfMake.vfs = pdfFonts;
    const doc = generateClass9ResultPdfDefinition(sessionCode, className, sectionName, students);
    const filename = `Class_${className}_${sectionName}_Results_${sessionCode}.pdf`;
    return new Promise<void>((resolve, reject) => {
        try {
            pdfMake.createPdf(doc).getBuffer((buffer: Uint8Array) => {
                const blob = new Blob([buffer], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};
