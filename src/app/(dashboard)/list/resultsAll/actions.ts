'use server'

import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx'

export async function exportResultsToExcel(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, sessionId },
        include: {
            Class: true, Section: true, Session: true,
            marksJunior: {
                include: { classSubject: { include: { subject: true } }, halfYearly: true, yearly: true },
                where: { sessionId },
                orderBy: { classSubject: { subject: { name: 'asc' } } }
            }
        },
        orderBy: { name: 'asc' }
    });

    if (students.length === 0) throw new Error('No students found for the selected filters');

    const subjectMap = new Map<string, { name: string; code: string }>();
    for (const student of students) {
        for (const mark of student.marksJunior) {
            const subject = mark.classSubject.subject;
            if (!subjectMap.has(subject.code)) subjectMap.set(subject.code, { name: subject.name, code: subject.code });
        }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow1: string[] = ['S.No', 'Student Name', 'Adm No'];
    const headerRow2: string[] = ['', '', ''];
    for (const subject of subjects) {
        headerRow1.push(subject.name, '', '', '', '', '');
        headerRow2.push('UT1', 'UT2', 'NB', 'Sub Enrich', 'HYE', 'Total(T1)');
        headerRow1.push('', '', '', '', '');
        headerRow2.push('UT3', 'NB', 'Sub Enrich', 'YE', 'Total(T2)');
        headerRow1.push('', '');
        headerRow2.push('Grand Total', 'Grade');
    }
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
        const marksBySubject = new Map<string, typeof student.marksJunior[0]>();
        for (const mark of student.marksJunior) marksBySubject.set(mark.classSubject.subject.code, mark);

        let totalMarks = 0, maxPossibleMarks = 0;
        for (const subject of subjects) {
            const mark = marksBySubject.get(subject.code);
            if (mark) {
                const isThirtyMarksSubject = subject.code.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
                const halfYearlyExamMarks = isThirtyMarksSubject ? mark.halfYearly?.examMarks30 : mark.halfYearly?.examMarks;
                const yearlyExamMarks = isThirtyMarksSubject ? mark.yearly?.yearlyexamMarks30 : mark.yearly?.yearlyexamMarks;
                row.push(mark.halfYearly?.ut1 ?? null, mark.halfYearly?.ut2 ?? null, mark.halfYearly?.noteBook ?? null,
                    mark.halfYearly?.subEnrichment ?? null, halfYearlyExamMarks ?? null, mark.halfYearly?.totalMarks ?? null);
                row.push(mark.yearly?.ut3 ?? null, mark.yearly?.yearlynoteBook ?? null, mark.yearly?.yearlysubEnrichment ?? null,
                    yearlyExamMarks ?? null, mark.yearly?.yearlytotalMarks ?? null);
                row.push(mark.grandTotalMarks ?? null, mark.grandTotalGrade ?? null);
                totalMarks += (mark.halfYearly?.totalMarks ?? 0) + (mark.yearly?.yearlytotalMarks ?? 0);
                maxPossibleMarks += (isThirtyMarksSubject ? 50 : 100) * 2;
            } else {
                row.push(null, null, null, null, null, null, null, null, null, null, null, null, null);
            }
        }
        const overallPercentage = maxPossibleMarks > 0 ? Number((totalMarks / maxPossibleMarks * 100).toFixed(2)) : 0;
        row.push(totalMarks, overallPercentage, getGrade(overallPercentage));
        dataRows.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
    const className = students[0]?.Class?.name ?? 'Class';
    const sectionName = students[0]?.Section?.name ?? 'Section';
    XLSX.utils.book_append_sheet(workbook, worksheet, `${className}-${sectionName}`);
    return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })).toString('base64');
}

export async function fetchClassResultsForPdf(sessionId: number, classId: number, sectionId: number) {
    const students = await prisma.student.findMany({
        where: { classId, sectionId, sessionId },
        include: {
            Class: true, Section: true, Session: true,
            marksJunior: {
                include: { classSubject: { include: { subject: true } }, halfYearly: true, yearly: true },
                where: { sessionId }
            }
        },
        orderBy: { name: 'asc' }
    });

    if (students.length === 0) throw new Error('No students found for the selected filters');

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
        session: student.Session || { sessioncode: 'N/A', sessionfrom: new Date(), sessionto: new Date() },
    }));

    return { sessionCode, className, sectionName, students: processedStudents };
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
}
