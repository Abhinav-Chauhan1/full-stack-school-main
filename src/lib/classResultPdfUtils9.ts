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
        { text: 'Class 9 Result Detailed Summary', style: 'header', alignment: 'center', margin: [0, 0, 0, 6] },
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
        const regularMarks = marks.filter((m: any) => m.sectionSubject?.subject?.code !== 'IT001');
        const itMark = marks.find((m: any) => m.sectionSubject?.subject?.code === 'IT001');

        let totalObtained = 0, totalMax = 0;
        for (const m of regularMarks) {
            if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
        }
        if (itMark?.total != null) { totalObtained += itMark.total; totalMax += 100; }
        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;

        // 12 columns: Subject | PT1 PT2 PT3 BestPT MA Portfolio SE BestScore FinalExam | GrandTotal Grade
        const subjectRows = regularMarks.map((m: any) => [
            { text: m.sectionSubject?.subject?.name ?? '-', style: 'cellLeft' },
            { text: fmt(m.pt1), style: 'cell' },
            { text: fmt(m.pt2), style: 'cell' },
            { text: fmt(m.pt3), style: 'cell' },
            { text: fmt(m.bestTwoPTAvg), style: 'cell' },
            { text: fmt(m.multipleAssessment), style: 'cell' },
            { text: fmt(m.portfolio), style: 'cell' },
            { text: fmt(m.subEnrichment), style: 'cell' },
            { text: fmt(m.bestScore), style: 'cell' },
            { text: fmt(m.finalExam), style: 'cell' },
            { text: fmt(m.grandTotal), style: 'cellBold' },
            { text: m.grade ?? '-', style: 'cellBold' },
        ]);

        const itRow: any[] = itMark ? [[
            { text: 'Vocational (I.T.)', colSpan: 3, style: 'cellLeft' }, {}, {},
            { text: 'Theory /70', colSpan: 3, style: 'cell', color: '#6b7280' }, {}, {},
            { text: fmt(itMark.theory), colSpan: 2, style: 'cell' }, {},
            { text: 'Practical /30', style: 'cell', color: '#6b7280' },
            { text: fmt(itMark.practical), style: 'cell' },
            { text: fmt(itMark.total), style: 'cellBold' },
            { text: itMark.grade ?? '-', style: 'cellBold' },
        ]] : [];

        // totalRow: colSpan:9 (cols 0-8) + colSpan:2 (cols 9-10) + col 11
        const totalRow = [
            { text: 'OVER ALL TOTAL (MAIN SUBJECTS)', colSpan: 9, alignment: 'center', style: 'summaryLabel', fillColor: '#f0fdf4' },
            {}, {}, {}, {}, {}, {}, {}, {},
            { text: `${totalObtained} / ${totalMax}`, colSpan: 2, alignment: 'center', style: 'summaryValue', fillColor: '#f0fdf4' },
            {},
            { text: '', fillColor: '#f0fdf4' },
        ];

        // pctRow: colSpan:2 (0-1) + colSpan:7 (2-8) + col9 + colSpan:2 (10-11)
        const pctRow = [
            { text: 'Over All Percentage:', colSpan: 2, alignment: 'center', style: 'summaryLabel', fillColor: '#eff6ff' },
            {},
            { text: `${pct}%`, colSpan: 7, alignment: 'left', style: 'summaryValue', fillColor: '#eff6ff' },
            {}, {}, {}, {}, {}, {},
            { text: `Overall Grade: ${getOverallGrade(pct)}`, colSpan: 3, alignment: 'center', style: 'summaryValue', fillColor: '#eff6ff' },
            {}, {},
        ];

        const tableBody = [
            // Header row 1 — 12 cells
            [
                { text: 'Subject', rowSpan: 2, style: 'th', alignment: 'left' },
                { text: 'PT1', style: 'th' }, { text: 'PT2', style: 'th' }, { text: 'PT3', style: 'th' },
                { text: 'Best PT\nAvg', style: 'th' }, { text: 'M.A.', style: 'th' },
                { text: 'Portfolio', style: 'th' }, { text: 'S.E.', style: 'th' },
                { text: 'Best\nScore', style: 'th' }, { text: 'Final\nExam', style: 'th' },
                { text: 'Grand\nTotal', style: 'th' }, { text: 'Grade', style: 'th' },
            ],
            // Header row 2 — 12 cells (col 0 is rowSpan placeholder)
            [
                {},
                { text: '/5', style: 'thSub' }, { text: '/5', style: 'thSub' }, { text: '/5', style: 'thSub' },
                { text: '/5', style: 'thSub' }, { text: '/5', style: 'thSub' },
                { text: '/5', style: 'thSub' }, { text: '/5', style: 'thSub' },
                { text: '/20', style: 'thSub' }, { text: '/80', style: 'thSub' },
                { text: '/100', style: 'thSub' }, { text: '', style: 'thSub' },
            ],
            ...subjectRows,
            ...itRow,
            totalRow,
            pctRow,
        ];

        // Student info as plain text columns (no nested table to avoid border issues)
        const studentInfoBlock = {
            columns: [
                {
                    width: '*',
                    stack: [
                        { text: `Name: ${studentResult.student?.name ?? '-'}`, style: 'infoText', bold: true },
                        { text: `Adm No: ${studentResult.student?.admissionno ?? '-'}`, style: 'infoText' },
                    ],
                },
                {
                    width: 120,
                    text: `Class: ${studentResult.student?.Class?.name?.replace('Class ', '') ?? '-'} - ${studentResult.student?.Section?.name ?? '-'}`,
                    style: 'infoText',
                },
                {
                    width: '*',
                    stack: [
                        { text: `Father: ${studentResult.student?.fathername ?? '-'}`, style: 'infoText' },
                        { text: `Mother: ${studentResult.student?.mothername ?? '-'}`, style: 'infoText' },
                    ],
                },
            ],
            margin: [0, 0, 0, 3],
        };

        const marksTableBlock = {
            table: {
                headerRows: 2,
                widths: ['*', 20, 20, 20, 30, 22, 28, 20, 28, 28, 30, 22],
                body: tableBody,
            },
            layout: {
                paddingLeft: () => 2,
                paddingRight: () => 2,
                paddingTop: () => 2,
                paddingBottom: () => 2,
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#9ca3af',
                vLineColor: () => '#9ca3af',
            },
        };

        if (index > 0 && index % 3 === 0) {
            content.push({ text: '', pageBreak: 'before' });
        }

        content.push({
            stack: [studentInfoBlock, marksTableBlock],
            margin: [0, 0, 0, 14],
        });
    });

    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [15, 15, 15, 15],
        compress: true,
        content,
        styles: {
            header: { fontSize: 13, bold: true },
            subheader: { fontSize: 9, color: '#4b5563' },
            infoText: { fontSize: 8, margin: [0, 1, 0, 1] },
            th: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e0e7ff' },
            thSub: { fontSize: 6, alignment: 'center', color: '#6b7280', fillColor: '#f3f4f6' },
            cell: { fontSize: 8, alignment: 'center' },
            cellLeft: { fontSize: 8, alignment: 'left' },
            cellBold: { fontSize: 8, alignment: 'center', bold: true },
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
