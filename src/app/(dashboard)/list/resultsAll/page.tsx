import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Select from "@/components/Select";
import ExcelExportButton from "./ExcelExportButton";
import ClassPdfExportButton from "./ClassPdfExportButton";
import Class9ExportButtons from "./Class9ExportButtons";
import Class11ExportButtons from "./Class11ExportButtons";

const ResultsAllPage = async ({
    searchParams,
}: {
    searchParams: { [key: string]: string | undefined };
}) => {
    const { sessionClaims } = auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (role !== "admin") {
        throw new Error("You don't have permission to access this page");
    }

    const { page, sessionId, classId, sectionId } = searchParams;
    const p = page ? parseInt(page) : 1;

    const sessions = await prisma.session.findMany({ orderBy: { sessionfrom: "desc" } });
    const classes = await prisma.class.findMany({
        orderBy: { classNumber: "asc" },
        include: { sections: true },
    });

    const query: any = {};
    if (classId) query.classId = parseInt(classId);
    if (sectionId) query.sectionId = parseInt(sectionId);
    if (sessionId) query.sessionId = parseInt(sessionId);

    const filtersSelected = classId && sectionId && sessionId;
    const selectedClass = classId ? classes.find(c => c.id === parseInt(classId)) : null;
    const classNumber = selectedClass?.classNumber ?? 0;
    const isClass9 = classNumber === 9;
    const isClass11 = classNumber === 11;
    const isJunior = !isClass9 && !isClass11;

    let students: any[] = [];
    let count = 0;
    let allSubjects: { name: string; code: string }[] = [];

    if (filtersSelected) {
        const includeMarks = isClass9
            ? { marksSenior: { include: { sectionSubject: { include: { subject: { select: { name: true, code: true } } } } }, where: { sessionId: parseInt(sessionId!) }, orderBy: { sectionSubject: { subject: { name: 'asc' as const } } } } }
            : isClass11
            ? { markHigher: { include: { sectionSubject: { include: { subject: { select: { name: true, code: true } } } } }, where: { sessionId: parseInt(sessionId!) }, orderBy: { sectionSubject: { subject: { name: 'asc' as const } } } } }
            : { marksJunior: { include: { classSubject: { include: { subject: { select: { name: true, code: true } } } }, halfYearly: true, yearly: true }, where: { sessionId: parseInt(sessionId!) }, orderBy: { classSubject: { subject: { name: 'asc' as const } } } } };

        const [studentsData, countData] = await prisma.$transaction([
            prisma.student.findMany({
                where: query,
                include: { Class: true, Section: true, Session: true, ...includeMarks },
                orderBy: { name: "asc" },
                take: ITEM_PER_PAGE,
                skip: ITEM_PER_PAGE * (p - 1),
            }),
            prisma.student.count({ where: query }),
        ]);
        students = studentsData;
        count = countData;

        if (isJunior) {
            const subjectMap = new Map<string, { name: string; code: string }>();
            const allMarks = await prisma.juniorMark.findMany({
                where: { student: query, sessionId: parseInt(sessionId!) },
                select: { classSubject: { select: { subject: { select: { name: true, code: true } } } } },
                distinct: ['classSubjectId'],
            });
            for (const m of allMarks) {
                const s = m.classSubject.subject;
                if (!subjectMap.has(s.code)) subjectMap.set(s.code, s);
            }
            allSubjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    const getExamMarks = (examData: any, isYearly: boolean, code: string) => {
        if (!examData) return '-';
        const is30 = code.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
        if (is30) return isYearly ? examData.yearlyexamMarks30 ?? '-' : examData.examMarks30 ?? '-';
        return isYearly ? examData.yearlyexamMarks ?? '-' : examData.examMarks ?? '-';
    };

    const fmt = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        if (val === -1) return 'AB';
        return Math.round(val);
    };

    const getGrade = (pct: number) => {
        if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2'; if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2'; if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D'; return 'E';
    };

    const calcJuniorOverall = (marks: any[]) => {
        let total = 0, max = 0;
        for (const m of marks) {
            const is30 = m?.classSubject?.subject?.code?.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
            const mp = is30 ? 50 : 100;
            if (m.halfYearly?.totalMarks != null) { total += m.halfYearly.totalMarks; max += mp; }
            if (m.yearly?.yearlytotalMarks != null) { total += m.yearly.yearlytotalMarks; max += mp; }
        }
        return { total, max, pct: max > 0 ? Number((total / max * 100).toFixed(2)) : 0 };
    };

    const calcSeniorOverall = (marks: any[]) => {
        let total = 0, max = 0;
        for (const m of marks) {
            if (m.sectionSubject?.subject?.code === 'IT001') {
                if (m.total != null) { total += m.total; max += 100; }
            } else if (m.grandTotal != null) { total += m.grandTotal; max += 100; }
        }
        return { total, max, pct: max > 0 ? Number((total / max * 100).toFixed(2)) : 0 };
    };

    const calcHigherOverall = (marks: any[]) => {
        let total = 0, max = 0;
        for (const m of marks) {
            if (m.sectionSubject?.subject?.code === 'PAI02') {
                const t = (m.theory30 || 0) + (m.practical70 || 0);
                if (t > 0) { total += t; max += 100; }
            } else if (m.grandTotal != null) { total += m.grandTotal; max += 100; }
        }
        return { total, max, pct: max > 0 ? Number((total / max * 100).toFixed(2)) : 0 };
    };

    return (
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">All Results</h1>
                    <div className="flex items-center gap-2">
                        {filtersSelected && isJunior && (
                            <>
                                <ClassPdfExportButton sessionId={parseInt(sessionId!)} classId={parseInt(classId!)} sectionId={parseInt(sectionId!)} />
                                <ExcelExportButton sessionId={parseInt(sessionId!)} classId={parseInt(classId!)} sectionId={parseInt(sectionId!)} />
                                <FormContainer table="result" type="print" data={{ classId, sectionId, sessionId: parseInt(sessionId!) }} />
                            </>
                        )}
                        {filtersSelected && isClass9 && (
                            <Class9ExportButtons sessionId={parseInt(sessionId!)} classId={parseInt(classId!)} sectionId={parseInt(sectionId!)} />
                        )}
                        {filtersSelected && isClass11 && (
                            <Class11ExportButtons sessionId={parseInt(sessionId!)} classId={parseInt(classId!)} sectionId={parseInt(sectionId!)} />
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select name="sessionId" label="Session" options={sessions.map(s => ({ value: s.id.toString(), label: s.sessioncode }))} />
                    <Select name="classId" label="Class" options={classes.map(c => ({ value: c.id.toString(), label: c.name }))} />
                    <Select
                        name="sectionId"
                        label="Section"
                        options={classId ? classes.find(c => c.id === parseInt(classId))?.sections.map(s => ({ value: s.id.toString(), label: s.name })) ?? [] : []}
                        disabled={!classId}
                    />
                </div>
            </div>

            {!filtersSelected ? (
                <div className="mt-8 text-center text-gray-500"><p className="text-lg">Please select Session, Class, and Section to view results</p></div>
            ) : students.length === 0 ? (
                <div className="mt-8 text-center text-gray-500"><p className="text-lg">No students found for the selected filters</p></div>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    {students.map((student: any) => {
                        // CLASS 9
                        if (isClass9) {
                            const marks: any[] = student.marksSenior ?? [];
                            const regularMarks = marks.filter((m: any) => m.sectionSubject?.subject?.code !== 'IT001');
                            const itMark = marks.find((m: any) => m.sectionSubject?.subject?.code === 'IT001');
                            const { total, max, pct } = calcSeniorOverall(marks);
                            return (
                                <div key={student.id} className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold">{student.name}</span>
                                            <span className="text-sm text-gray-500">Adm No: {student.admissionno ?? '-'}</span>
                                            <span className="text-sm text-gray-500">{student.Class?.name} - {student.Section?.name}</span>
                                        </div>
                                        <FormContainer table="result9" type="print" id={student.id} data={{ sessionId: parseInt(sessionId!) }} />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-blue-50">
                                                    <th rowSpan={2} className="border px-2 py-1 text-left min-w-[120px]">Subject</th>
                                                    <th className="border px-1 py-1 text-center">PT1</th>
                                                    <th className="border px-1 py-1 text-center">PT2</th>
                                                    <th className="border px-1 py-1 text-center">PT3</th>
                                                    <th className="border px-1 py-1 text-center">Best PT Avg</th>
                                                    <th className="border px-1 py-1 text-center">M.A.</th>
                                                    <th className="border px-1 py-1 text-center">Portfolio</th>
                                                    <th className="border px-1 py-1 text-center">S.E.</th>
                                                    <th className="border px-1 py-1 text-center">Best Score</th>
                                                    <th className="border px-1 py-1 text-center">Final Exam</th>
                                                    <th className="border px-1 py-1 text-center font-semibold">Grand Total</th>
                                                    <th className="border px-1 py-1 text-center font-semibold">Grade</th>
                                                </tr>
                                                <tr className="bg-gray-50 text-[10px] text-gray-400">
                                                    <td className="border px-1 py-0.5 text-center">/5</td><td className="border px-1 py-0.5 text-center">/5</td>
                                                    <td className="border px-1 py-0.5 text-center">/5</td><td className="border px-1 py-0.5 text-center">/5</td>
                                                    <td className="border px-1 py-0.5 text-center">/5</td><td className="border px-1 py-0.5 text-center">/5</td>
                                                    <td className="border px-1 py-0.5 text-center">/5</td><td className="border px-1 py-0.5 text-center">/20</td>
                                                    <td className="border px-1 py-0.5 text-center">/80</td><td className="border px-1 py-0.5 text-center">/100</td>
                                                    <td className="border px-1 py-0.5 text-center"></td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {regularMarks.map((m: any) => (
                                                    <tr key={m.id} className="even:bg-gray-50 hover:bg-blue-50">
                                                        <td className="border px-2 py-1 text-left">{m.sectionSubject?.subject?.name ?? '-'}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.pt1)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.pt2)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.pt3)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.bestTwoPTAvg)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.multipleAssessment)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.portfolio)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.subEnrichment)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.bestScore)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.finalExam)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(m.grandTotal)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{m.grade ?? '-'}</td>
                                                    </tr>
                                                ))}
                                                {itMark && (
                                                    <tr className="bg-yellow-50">
                                                        <td className="border px-2 py-1 font-medium">Vocational (I.T.)</td>
                                                        <td colSpan={2} className="border px-1 py-1 text-center text-gray-400 text-[10px]">Theory /70</td>
                                                        <td colSpan={3} className="border px-1 py-1 text-center">{fmt(itMark.theory)}</td>
                                                        <td colSpan={2} className="border px-1 py-1 text-center text-gray-400 text-[10px]">Practical /30</td>
                                                        <td colSpan={2} className="border px-1 py-1 text-center">{fmt(itMark.practical)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(itMark.total)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{itMark.grade ?? '-'}</td>
                                                    </tr>
                                                )}
                                                <tr className="bg-green-50 font-semibold text-[11px]">
                                                    <td colSpan={9} className="border px-2 py-1 text-center">OVER ALL TOTAL (MAIN SUBJECTS)</td>
                                                    <td colSpan={2} className="border px-1 py-1 text-center">{total} / {max}</td>
                                                    <td className="border px-1 py-1"></td>
                                                </tr>
                                                <tr className="bg-blue-50 font-semibold text-[11px]">
                                                    <td colSpan={2} className="border px-2 py-1 text-center">Over All Percentage:</td>
                                                    <td colSpan={7} className="border px-1 py-1">{pct}%</td>
                                                    <td className="border px-1 py-1 text-center">Overall Grade:</td>
                                                    <td colSpan={2} className="border px-1 py-1 text-center">{getGrade(pct)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }

                        // CLASS 11
                        if (isClass11) {
                            const marks: any[] = student.markHigher ?? [];
                            const regularMarks = marks.filter((m: any) => m.sectionSubject?.subject?.code !== 'PAI02');
                            const paintingMark = marks.find((m: any) => m.sectionSubject?.subject?.code === 'PAI02');
                            const { total, max, pct } = calcHigherOverall(marks);
                            return (
                                <div key={student.id} className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold">{student.name}</span>
                                            <span className="text-sm text-gray-500">Adm No: {student.admissionno ?? '-'}</span>
                                            <span className="text-sm text-gray-500">{student.Class?.name} - {student.Section?.name}</span>
                                        </div>
                                        <FormContainer table="result11" type="print" id={student.id} data={{ sessionId: parseInt(sessionId!) }} />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-blue-50">
                                                    <th rowSpan={2} className="border px-2 py-1 text-left min-w-[120px]">Subject</th>
                                                    <th className="border px-1 py-1 text-center">Unit Test 1</th>
                                                    <th className="border px-1 py-1 text-center">Half Yearly</th>
                                                    <th className="border px-1 py-1 text-center">Unit Test 2</th>
                                                    <th className="border px-1 py-1 text-center">Theory</th>
                                                    <th className="border px-1 py-1 text-center">Practical</th>
                                                    <th className="border px-1 py-1 text-center font-semibold">Grand Total</th>
                                                    <th className="border px-1 py-1 text-center font-semibold">Grade</th>
                                                </tr>
                                                <tr className="bg-gray-50 text-[10px] text-gray-400">
                                                    <td className="border px-1 py-0.5 text-center">/10</td>
                                                    <td className="border px-1 py-0.5 text-center">/30</td>
                                                    <td className="border px-1 py-0.5 text-center">/10</td>
                                                    <td className="border px-1 py-0.5 text-center">/30</td>
                                                    <td className="border px-1 py-0.5 text-center">/20</td>
                                                    <td className="border px-1 py-0.5 text-center">/100</td>
                                                    <td className="border px-1 py-0.5 text-center"></td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {regularMarks.map((m: any) => (
                                                    <tr key={m.id} className="even:bg-gray-50 hover:bg-blue-50">
                                                        <td className="border px-2 py-1 text-left">{m.sectionSubject?.subject?.name ?? '-'}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.unitTest1)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.halfYearly)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.unitTest2)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.theory)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(m.practical)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(m.grandTotal)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{m.grade ?? '-'}</td>
                                                    </tr>
                                                ))}
                                                {paintingMark && (
                                                    <tr className="bg-purple-50">
                                                        <td className="border px-2 py-1 font-medium">{paintingMark.sectionSubject?.subject?.name} (Additional)</td>
                                                        <td colSpan={2} className="border px-1 py-1 text-center text-gray-400 text-[10px]">Theory /30</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(paintingMark.theory30)}</td>
                                                        <td className="border px-1 py-1 text-center text-gray-400 text-[10px]">Practical /70</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(paintingMark.practical70)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt((paintingMark.theory30 || 0) + (paintingMark.practical70 || 0))}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{paintingMark.grade ?? '-'}</td>
                                                    </tr>
                                                )}
                                                <tr className="bg-green-50 font-semibold text-[11px]">
                                                    <td colSpan={5} className="border px-2 py-1 text-center">OVER ALL TOTAL (MAIN SUBJECTS)</td>
                                                    <td colSpan={2} className="border px-1 py-1 text-center">{total} / {max}</td>
                                                    <td className="border px-1 py-1"></td>
                                                </tr>
                                                <tr className="bg-blue-50 font-semibold text-[11px]">
                                                    <td colSpan={2} className="border px-2 py-1 text-center">Over All Percentage:</td>
                                                    <td colSpan={3} className="border px-1 py-1">{pct}%</td>
                                                    <td className="border px-1 py-1 text-center">Overall Grade:</td>
                                                    <td colSpan={2} className="border px-1 py-1 text-center">{getGrade(pct)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }

                        // JUNIOR (classes 1-8)
                        const marksBySubject = new Map<string, any>();
                        for (const mark of student.marksJunior ?? []) {
                            marksBySubject.set(mark.classSubject.subject.code, mark);
                        }
                        const { total, max, pct } = calcJuniorOverall(student.marksJunior ?? []);
                        return (
                            <div key={student.id} className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold">{student.name}</span>
                                        <span className="text-sm text-gray-500">Adm No: {student.admissionno ?? '-'}</span>
                                        <span className="text-sm text-gray-500">{student.Class?.name} - {student.Section?.name}</span>
                                    </div>
                                    <FormContainer table="resultExport" type="print" id={student.id} data={{ sessionId: parseInt(sessionId!) }} />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-blue-50">
                                                <th rowSpan={2} className="border px-2 py-1 text-left min-w-[120px]">Subject</th>
                                                <th colSpan={6} className="border px-2 py-1 text-center bg-blue-100">TERM 1</th>
                                                <th colSpan={5} className="border px-2 py-1 text-center bg-green-100">TERM 2</th>
                                                <th colSpan={2} className="border px-2 py-1 text-center bg-yellow-50">Overall</th>
                                            </tr>
                                            <tr className="bg-gray-50 text-[10px]">
                                                <th className="border px-1 py-1 text-center">UT1</th>
                                                <th className="border px-1 py-1 text-center">UT2</th>
                                                <th className="border px-1 py-1 text-center">NB</th>
                                                <th className="border px-1 py-1 text-center">Sub Enr</th>
                                                <th className="border px-1 py-1 text-center">HYE</th>
                                                <th className="border px-1 py-1 text-center font-semibold">Total</th>
                                                <th className="border px-1 py-1 text-center">UT3</th>
                                                <th className="border px-1 py-1 text-center">NB</th>
                                                <th className="border px-1 py-1 text-center">Sub Enr</th>
                                                <th className="border px-1 py-1 text-center">YE</th>
                                                <th className="border px-1 py-1 text-center font-semibold">Total</th>
                                                <th className="border px-1 py-1 text-center font-semibold">Grand</th>
                                                <th className="border px-1 py-1 text-center font-semibold">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allSubjects.map((subject) => {
                                                const mark = marksBySubject.get(subject.code);
                                                return (
                                                    <tr key={subject.code} className="even:bg-gray-50 hover:bg-blue-50">
                                                        <td className="border px-2 py-1 text-left">{subject.name}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.halfYearly?.ut1)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.halfYearly?.ut2)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.halfYearly?.noteBook)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.halfYearly?.subEnrichment)}</td>
                                                        <td className="border px-1 py-1 text-center">{mark ? getExamMarks(mark.halfYearly, false, subject.code) : '-'}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(mark?.halfYearly?.totalMarks)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.yearly?.ut3)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.yearly?.yearlynoteBook)}</td>
                                                        <td className="border px-1 py-1 text-center">{fmt(mark?.yearly?.yearlysubEnrichment)}</td>
                                                        <td className="border px-1 py-1 text-center">{mark ? getExamMarks(mark.yearly, true, subject.code) : '-'}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(mark?.yearly?.yearlytotalMarks)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{fmt(mark?.grandTotalMarks)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{mark?.grandTotalGrade ?? '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-green-50 font-semibold text-[11px]">
                                                <td colSpan={11} className="border px-2 py-1 text-center">OVER ALL TOTAL (TERM 1 & TERM 2) OF MAIN SUBJECTS</td>
                                                <td colSpan={2} className="border px-1 py-1 text-center">{total} / {max}</td>
                                            </tr>
                                            <tr className="bg-blue-50 font-semibold text-[11px]">
                                                <td colSpan={2} className="border px-2 py-1 text-center">Over All Percentage:</td>
                                                <td colSpan={9} className="border px-1 py-1">{pct}%</td>
                                                <td className="border px-1 py-1 text-center">Overall Grade:</td>
                                                <td className="border px-1 py-1 text-center">{getGrade(pct)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                    <Pagination page={p} count={count} />
                </div>
            )}
        </div>
    );
};

export default ResultsAllPage;
