'use server'

import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx'

export async function exportResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    // Fetch all students with their marks
    const students = await prisma.student.findMany({
        where: {
            classId,
            sectionId,
            sessionId,
        },
        include: {
            Class: true,
            Section: true,
            Session: true,
            marksJunior: {
                include: {
                    classSubject: {
                        include: {
                            subject: true
                        }
                    },
                    halfYearly: true,
                    yearly: true,
                },
                where: { sessionId },
                orderBy: {
                    classSubject: {
                        subject: {
                            name: 'asc'
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    if (students.length === 0) {
        throw new Error('No students found for the selected filters');
    }

    // Collect all unique subjects across all students (ordered)
    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const student of students) {
        for (const mark of student.marksJunior) {
            const subject = mark.classSubject.subject;
            if (!subjectMap.has(subject.code)) {
                subjectMap.set(subject.code, { name: subject.name, code: subject.code });
            }
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Build header rows
    // Row 1: merged-like headers
    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];

    for (const subject of subjects) {
        // Term 1 columns
        headerRow1.push(subject.name, '', '', '', '', '');
        headerRow2.push('UT1', 'UT2', 'NB', 'Sub Enrich', 'HYE', 'Total(T1)');
        // Term 2 columns
        headerRow1.push('', '', '', '', '');
        headerRow2.push('UT3', 'NB', 'Sub Enrich', 'YE', 'Total(T2)');
        // Grand total columns
        headerRow1.push('', '');
        headerRow2.push('Grand Total', 'Grade');
    }

    // Add overall columns
    headerRow1.push('Overall Total', 'Overall %', 'Overall Grade');
    headerRow2.push('', '', '');

    // Build data rows
    const dataRows: (string | number | null)[][] = [];

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const row: (string | number | null)[] = [
            i + 1,
            student.name,
            student.admissionno,
        ];

        // Create a map of student's marks by subject code
        const marksBySubject = new Map<string, typeof student.marksJunior[0]>();
        for (const mark of student.marksJunior) {
            marksBySubject.set(mark.classSubject.subject.code, mark);
        }

        let totalMarks = 0;
        let maxPossibleMarks = 0;

        for (const subject of subjects) {
            const mark = marksBySubject.get(subject.code);

            if (mark) {
                const isFortyMarksSubject = false; // Comp01, GK01, DRAW02 are now 30-mark subjects
                const isThirtyMarksSubject = subject.code.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);

                // Determine which exam marks field to use
                let halfYearlyExamMarks = mark.halfYearly?.examMarks;
                if (isFortyMarksSubject) halfYearlyExamMarks = mark.halfYearly?.examMarks40;
                if (isThirtyMarksSubject) halfYearlyExamMarks = mark.halfYearly?.examMarks30;

                let yearlyExamMarks = mark.yearly?.yearlyexamMarks;
                if (isFortyMarksSubject) yearlyExamMarks = mark.yearly?.yearlyexamMarks40;
                if (isThirtyMarksSubject) yearlyExamMarks = mark.yearly?.yearlyexamMarks30;

                // Term 1
                row.push(
                    mark.halfYearly?.ut1 ?? null,
                    mark.halfYearly?.ut2 ?? null,
                    mark.halfYearly?.noteBook ?? null,
                    mark.halfYearly?.subEnrichment ?? null,
                    halfYearlyExamMarks ?? null,
                    mark.halfYearly?.totalMarks ?? null,
                );
                // Term 2
                row.push(
                    mark.yearly?.ut3 ?? null,
                    mark.yearly?.yearlynoteBook ?? null,
                    mark.yearly?.yearlysubEnrichment ?? null,
                    yearlyExamMarks ?? null,
                    mark.yearly?.yearlytotalMarks ?? null,
                );
                // Grand total
                row.push(
                    mark.grandTotalMarks ?? null,
                    mark.grandTotalGrade ?? null,
                );

                // Accumulate for overall calculation
                const halfYearlyTotal = mark.halfYearly?.totalMarks ?? 0;
                const yearlyTotal = mark.yearly?.yearlytotalMarks ?? 0;
                totalMarks += halfYearlyTotal + yearlyTotal;

                const maxPerTerm = isFortyMarksSubject || isThirtyMarksSubject ? 50 : 100;
                maxPossibleMarks += maxPerTerm * 2;
            } else {
                // No marks for this subject — fill with nulls
                row.push(null, null, null, null, null, null); // Term 1
                row.push(null, null, null, null, null); // Term 2
                row.push(null, null); // Grand total
            }
        }

        // Overall columns
        const overallPercentage = maxPossibleMarks > 0
            ? Number((totalMarks / maxPossibleMarks * 100).toFixed(2))
            : 0;

        const getGrade = (pct: number) => {
            if (pct >= 91) return 'A1';
            if (pct >= 81) return 'A2';
            if (pct >= 71) return 'B1';
            if (pct >= 61) return 'B2';
            if (pct >= 51) return 'C1';
            if (pct >= 41) return 'C2';
            if (pct >= 33) return 'D';
            return 'E';
        };

        row.push(totalMarks, overallPercentage, getGrade(overallPercentage));
        dataRows.push(row);
    }

    // Build the workbook
    const workbook = XLSX.utils.book_new();
    const worksheetData = [headerRow1, headerRow2, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = [
        { wch: 5 },   // S.No
        { wch: 25 },  // Name
        { wch: 10 },  // Adm No
    ];
    for (let i = 0; i < subjects.length; i++) {
        // 13 columns per subject
        colWidths.push(
            { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 6 }, { wch: 10 },  // Term 1
            { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 6 }, { wch: 10 },  // Term 2
            { wch: 10 }, { wch: 8 },  // Grand total
        );
    }
    colWidths.push({ wch: 12 }, { wch: 10 }, { wch: 12 }); // Overall
    worksheet['!cols'] = colWidths;

    // Get class and session info for sheet name
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';

    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return Buffer.from(buffer).toString('base64');
}

export async function fetchClassResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    // Fetch students, class, section, session and marks
    const students = await prisma.student.findMany({
        where: {
            classId,
            sectionId,
            sessionId,
        },
        include: {
            Class: true,
            Section: true,
            Session: true,
            marksJunior: {
                include: {
                    classSubject: {
                        include: {
                            subject: true
                        }
                    },
                    halfYearly: true,
                    yearly: true,
                },
                where: { sessionId }
            }
        },
        orderBy: { name: 'asc' }
    });

    if (students.length === 0) {
        throw new Error('No students found for the selected filters');
    }

    const sessionCode = students[0]?.Session?.sessioncode ?? 'N/A';
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';

    const processedStudents = students.map((student) => ({
        student: {
            name: student.name,
            birthday: student.birthday,
            Class: student.Class || { name: '', classNumber: 0 },
            Section: student.Section || { name: '' },
            admissionno: student.admissionno,
            mothername: student.mothername,
            moccupation: student.moccupation,
            fathername: student.fathername,
            foccupation: student.foccupation,
            address: student.address,
            city: student.city,
            village: student.village,
            bloodgroup: student.bloodgroup,
        },
        marksJunior: student.marksJunior,
        session: student.Session || {
            sessioncode: 'N/A',
            sessionfrom: new Date(),
            sessionto: new Date()
        },
    }));

    return {
        sessionCode,
        className,
        sectionName,
        students: processedStudents
    };
}

// ─── CLASS 9 (Senior) ────────────────────────────────────────────────────────

export async function exportSeniorResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    const allStudents = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            marksSenior: {
                include: { sectionSubject: { include: { subject: true } } },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    const students = allStudents.filter(s => s.marksSenior.length > 0);
    if (students.length === 0) throw new Error('No students found with marks for this session');

    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const s of students) {
        for (const m of s.marksSenior) {
            const sub = m.sectionSubject.subject;
            if (sub.code !== 'IT001' && !subjectMap.has(sub.code)) subjectMap.set(sub.code, sub);
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];
    for (const sub of subjects) {
        headerRow1.push(sub.name, '', '', '', '', '', '', '', '', '', '');
        headerRow2.push('PT1', 'PT2', 'PT3', 'Best PT Avg', 'M.A.', 'Portfolio', 'S.E.', 'Best Score', 'Final Exam', 'Grand Total', 'Grade');
    }
    headerRow1.push('Vocational IT', '', '');
    headerRow2.push('Theory(/70)', 'Practical(/30)', 'Total');
    headerRow1.push('Overall Total', 'Overall %', 'Overall Grade');
    headerRow2.push('', '', '');

    const getGrade = (pct: number) => {
        if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D'; return 'E';
    };

    const dataRows: (string | number | null)[][] = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const row: (string | number | null)[] = [i + 1, student.name, student.admissionno];
        const marksByCode = new Map(student.marksSenior.map(m => [m.sectionSubject.subject.code, m]));
        let totalObtained = 0, totalMax = 0;
        for (const sub of subjects) {
            const m = marksByCode.get(sub.code);
            if (m) {
                row.push(m.pt1 ?? null, m.pt2 ?? null, m.pt3 ?? null, m.bestTwoPTAvg ?? null,
                    m.multipleAssessment ?? null, m.portfolio ?? null, m.subEnrichment ?? null,
                    m.bestScore ?? null, m.finalExam ?? null, m.grandTotal ?? null, m.grade ?? null);
                if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
            } else {
                row.push(null, null, null, null, null, null, null, null, null, null, null);
            }
        }
        const itMark = marksByCode.get('IT001');
        row.push(itMark?.theory ?? null, itMark?.practical ?? null, itMark?.total ?? null);
        if (itMark?.total != null) { totalObtained += itMark.total; totalMax += 100; }
        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;
        row.push(totalObtained, pct, getGrade(pct));
        dataRows.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';
    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);
    return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })).toString('base64');
}

export async function fetchClass9ResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    const allStudents = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            marksSenior: {
                include: { sectionSubject: { include: { subject: true } }, coScholastic: true },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    const students = allStudents.filter(s => s.marksSenior.length > 0);
    if (students.length === 0) throw new Error('No students found with marks for this session');

    const sessionCode = students[0]?.Session?.sessioncode ?? 'N/A';
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';

    const processedStudents = students.map(student => ({
        student: {
            id: student.id,
            name: student.name,
            birthday: student.birthday,
            Class: student.Class || { name: '', classNumber: 0 },
            Section: student.Section || { name: '' },
            admissionno: student.admissionno,
            mothername: student.mothername,
            fathername: student.fathername,
            address: student.address,
            city: student.city,
            village: student.village,
            bloodgroup: student.bloodgroup,
            img: student.img ?? undefined,
        },
        marksSenior: student.marksSenior,
        session: student.Session || { sessioncode: 'N/A', sessionfrom: new Date(), sessionto: new Date() },
    }));

    return { sessionCode, className, sectionName, students: processedStudents };
}

// ─── CLASS 11 (Higher) ───────────────────────────────────────────────────────

export async function exportHigherResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    const allStudents = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            markHigher: {
                include: { sectionSubject: { include: { subject: true } } },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    const students = allStudents.filter(s => s.markHigher.length > 0);
    if (students.length === 0) throw new Error('No students found with marks for this session');

    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const s of students) {
        for (const m of s.markHigher) {
            const sub = m.sectionSubject.subject;
            if (sub.code !== 'PAI02' && !subjectMap.has(sub.code)) subjectMap.set(sub.code, sub);
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];
    for (const sub of subjects) {
        headerRow1.push(sub.name, '', '', '', '', '', '');
        headerRow2.push('Unit Test 1', 'Half Yearly', 'Unit Test 2', 'Theory', 'Practical', 'Grand Total', 'Grade');
    }
    headerRow1.push('Painting (PAI02)', '', '');
    headerRow2.push('Theory(/30)', 'Practical(/70)', 'Grand Total');
    headerRow1.push('Overall Total', 'Overall %', 'Overall Grade');
    headerRow2.push('', '', '');

    const getGrade = (pct: number) => {
        if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D'; return 'E';
    };

    const dataRows: (string | number | null)[][] = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const row: (string | number | null)[] = [i + 1, student.name, student.admissionno];
        const marksByCode = new Map(student.markHigher.map(m => [m.sectionSubject.subject.code, m]));
        let totalObtained = 0, totalMax = 0;
        for (const sub of subjects) {
            const m = marksByCode.get(sub.code);
            if (m) {
                row.push(m.unitTest1 ?? null, m.halfYearly ?? null, m.unitTest2 ?? null,
                    m.theory ?? null, m.practical ?? null, m.grandTotal ?? null, m.grade ?? null);
                if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
            } else {
                row.push(null, null, null, null, null, null, null);
            }
        }
        const pai = marksByCode.get('PAI02');
        const paiTotal = pai ? (pai.theory30 || 0) + (pai.practical70 || 0) : null;
        row.push(pai?.theory30 ?? null, pai?.practical70 ?? null, paiTotal);
        if (paiTotal) { totalObtained += paiTotal; totalMax += 100; }
        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;
        row.push(totalObtained, pct, getGrade(pct));
        dataRows.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';
    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);
    return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })).toString('base64');
}

export async function fetchClass11ResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    const allStudents = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            markHigher: {
                include: { sectionSubject: { include: { subject: true } }, coScholastic: true },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    const students = allStudents.filter(s => s.markHigher.length > 0);
    if (students.length === 0) throw new Error('No students found with marks for this session');

    const sessionCode = students[0]?.Session?.sessioncode ?? 'N/A';
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';

    const processedStudents = students.map(student => ({
        student: {
            id: student.id,
            name: student.name,
            birthday: student.birthday,
            Class: student.Class || { name: '' },
            Section: student.Section || { name: '' },
            admissionno: student.admissionno,
            mothername: student.mothername,
            fathername: student.fathername,
            address: student.address,
            city: student.city,
            village: student.village,
            img: student.img ?? undefined,
        },
        marksHigher: student.markHigher,
        session: student.Session || { sessioncode: 'N/A', sessionfrom: new Date(), sessionto: new Date() },
    }));

    return { sessionCode, className, sectionName, students: processedStudents };
}// ─── CLASS 9 (Senior) ────────────────────────────────────────────────────────

export async function exportSeniorResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            marksSenior: {
                include: { sectionSubject: { include: { subject: true } } },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    if (students.length === 0) throw new Error('No students found');

    // Only include students who have marks for this session
    const studentsWithMarks = students.filter(s => s.marksSenior.length > 0);
    if (studentsWithMarks.length === 0) throw new Error('No students found with marks for this session');

    // Collect unique regular subjects (exclude IT001)
    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const s of studentsWithMarks) {
        for (const m of s.marksSenior) {
            const sub = m.sectionSubject.subject;
            if (sub.code !== 'IT001' && !subjectMap.has(sub.code)) subjectMap.set(sub.code, sub);
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];
    for (const sub of subjects) {
        headerRow1.push(sub.name, '', '', '', '', '', '', '', '', '');
        headerRow2.push('PT1', 'PT2', 'PT3', 'Best PT Avg', 'M.A.', 'Portfolio', 'S.E.', 'Best Score', 'Final Exam', 'Grand Total', 'Grade');
        headerRow1.push('');
    }
    headerRow1.push('Vocational IT', '', '');
    headerRow2.push('Theory(/70)', 'Practical(/30)', 'Total');
    headerRow1.push('Overall Total', 'Overall %', 'Overall Grade');
    headerRow2.push('', '', '');

    const getGrade = (pct: number) => {
        if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D'; return 'E';
    };

    const dataRows: (string | number | null)[][] = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const row: (string | number | null)[] = [i + 1, student.name, student.admissionno];
        const marksByCode = new Map(student.marksSenior.map(m => [m.sectionSubject.subject.code, m]));

        let totalObtained = 0, totalMax = 0;
        for (const sub of subjects) {
            const m = marksByCode.get(sub.code);
            if (m) {
                row.push(m.pt1 ?? null, m.pt2 ?? null, m.pt3 ?? null, m.bestTwoPTAvg ?? null,
                    m.multipleAssessment ?? null, m.portfolio ?? null, m.subEnrichment ?? null,
                    m.bestScore ?? null, m.finalExam ?? null, m.grandTotal ?? null, m.grade ?? null);
                if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
            } else {
                row.push(null, null, null, null, null, null, null, null, null, null, null);
            }
        }
        const itMark = marksByCode.get('IT001');
        row.push(itMark?.theory ?? null, itMark?.practical ?? null, itMark?.total ?? null);
        if (itMark?.total != null) { totalObtained += itMark.total; totalMax += 100; }

        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;
        row.push(totalObtained, pct, getGrade(pct));
        dataRows.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    const className = studentsWithMarks[0]?.Class?.name ?? 'Class';
    const sectionName = studentsWithMarks[0]?.Section?.name ?? 'Section';
    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return Buffer.from(buffer).toString('base64');
}

export async function fetchClass9ResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            marksSenior: {
                include: { sectionSubject: { include: { subject: true } }, coScholastic: true },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    // Filter to only students who have marks for this session
    const studentsWithMarks = students.filter(s => s.marksSenior.length > 0);
    if (studentsWithMarks.length === 0) throw new Error('No students found with marks for this session');

    const sessionCode = studentsWithMarks[0]?.Session?.sessioncode ?? 'N/A';
    const className = studentsWithMarks[0]?.Class?.name ?? 'Class';
    const sectionName = studentsWithMarks[0]?.Section?.name ?? 'Section';

    const processedStudents = studentsWithMarks.map(student => ({

export async function exportHigherResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            markHigher: {
                include: { sectionSubject: { include: { subject: true } } },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    if (students.length === 0) throw new Error('No students found');

    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const s of students) {
        for (const m of s.markHigher) {
            const sub = m.sectionSubject.subject;
            if (sub.code !== 'PAI02' && !subjectMap.has(sub.code)) subjectMap.set(sub.code, sub);
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];
    for (const sub of subjects) {
        headerRow1.push(sub.name, '', '', '', '', '');
        headerRow2.push('Unit Test 1', 'Half Yearly', 'Unit Test 2', 'Theory', 'Practical', 'Grand Total', 'Grade');
        headerRow1.push('');
    }
    headerRow1.push('Painting (PAI02)', '');
    headerRow2.push('Theory(/30)', 'Practical(/70)', 'Grand Total');
    headerRow1.push('');
    headerRow1.push('Overall Total', 'Overall %', 'Overall Grade');
    headerRow2.push('', '', '');

    const getGrade = (pct: number) => {
        if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D'; return 'E';
    };

    const dataRows: (string | number | null)[][] = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const row: (string | number | null)[] = [i + 1, student.name, student.admissionno];
        const marksByCode = new Map(student.markHigher.map(m => [m.sectionSubject.subject.code, m]));

        let totalObtained = 0, totalMax = 0;
        for (const sub of subjects) {
            const m = marksByCode.get(sub.code);
            if (m) {
                row.push(m.unitTest1 ?? null, m.halfYearly ?? null, m.unitTest2 ?? null,
                    m.theory ?? null, m.practical ?? null, m.grandTotal ?? null, m.grade ?? null);
                if (m.grandTotal != null) { totalObtained += m.grandTotal; totalMax += 100; }
            } else {
                row.push(null, null, null, null, null, null, null);
            }
        }
        const pai = marksByCode.get('PAI02');
        const paiTotal = pai ? (pai.theory30 || 0) + (pai.practical70 || 0) : null;
        row.push(pai?.theory30 ?? null, pai?.practical70 ?? null, paiTotal);
        if (paiTotal) { totalObtained += paiTotal; totalMax += 100; }

        const pct = totalMax > 0 ? Number((totalObtained / totalMax * 100).toFixed(2)) : 0;
        row.push(totalObtained, pct, getGrade(pct));
        dataRows.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';
    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return Buffer.from(buffer).toString('base64');
}

export async function fetchClass11ResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, isAlumni: false },
        include: {
            Class: true, Section: true, Session: true,
            markHigher: {
                include: { sectionSubject: { include: { subject: true } }, coScholastic: true },
                where: { sessionId },
                orderBy: { sectionSubject: { subject: { name: 'asc' } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    const studentsWithMarks = students.filter(s => s.markHigher.length > 0);
    if (studentsWithMarks.length === 0) throw new Error('No students found with marks for this session');

    const sessionCode = studentsWithMarks[0]?.Session?.sessioncode ?? 'N/A';
    const className = studentsWithMarks[0]?.Class?.name ?? 'Class';
    const sectionName = studentsWithMarks[0]?.Section?.name ?? 'Section';

    const processedStudents = studentsWithMarks.map(student => ({
        student: {
            id: student.id,
            name: student.name,
            birthday: student.birthday,
            Class: student.Class || { name: '' },
            Section: student.Section || { name: '' },
            admissionno: student.admissionno,
            mothername: student.mothername,
            fathername: student.fathername,
            address: student.address,
            city: student.city,
            village: student.village,
            img: student.img ?? undefined,
        },
        marksHigher: student.markHigher,
        session: student.Session || { sessioncode: 'N/A', sessionfrom: new Date(), sessionto: new Date() },
    }));

    return { sessionCode, className, sectionName, students: processedStudents };
}
