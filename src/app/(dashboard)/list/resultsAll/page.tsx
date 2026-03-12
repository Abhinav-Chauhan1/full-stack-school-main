import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Select from "@/components/Select";
import ExcelExportButton from "./ExcelExportButton";
import ClassPdfExportButton from "./ClassPdfExportButton";

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

    // Fetch all sessions and classes for filters
    const sessions = await prisma.session.findMany({
        orderBy: { sessionfrom: "desc" },
    });

    const classes = await prisma.class.findMany({
        where: {
            classNumber: { lte: 8 }
        },
        orderBy: { classNumber: "asc" },
        include: {
            sections: true,
        },
    });

    // Build query for students
    const query: any = {};

    if (classId) query.classId = parseInt(classId);
    if (sectionId) query.sectionId = parseInt(sectionId);
    if (sessionId) query.sessionId = parseInt(sessionId);

    // Only fetch data if all filters are selected
    const filtersSelected = classId && sectionId && sessionId;

    let students: any[] = [];
    let count = 0;
    let allSubjects: { name: string; code: string }[] = [];

    if (filtersSelected) {
        const [studentsData, countData] = await prisma.$transaction([
            prisma.student.findMany({
                where: query,
                include: {
                    Class: true,
                    Section: true,
                    Session: true,
                    marksJunior: {
                        include: {
                            classSubject: {
                                include: {
                                    subject: {
                                        select: { name: true, code: true }
                                    }
                                }
                            },
                            halfYearly: true,
                            yearly: true,
                        },
                        where: { sessionId: parseInt(sessionId!) },
                        orderBy: {
                            classSubject: {
                                subject: { name: 'asc' }
                            }
                        }
                    }
                },
                orderBy: { name: "asc" },
                take: ITEM_PER_PAGE,
                skip: ITEM_PER_PAGE * (p - 1),
            }),
            prisma.student.count({ where: query }),
        ]);

        students = studentsData;
        count = countData;

        // Collect all unique subjects from all students
        const subjectMap = new Map<string, { name: string; code: string }>();
        // Fetch all students (not just paginated) to get complete subject list
        const allStudentsMarks = await prisma.juniorMark.findMany({
            where: {
                student: query,
                sessionId: parseInt(sessionId!),
            },
            select: {
                classSubject: {
                    select: {
                        subject: {
                            select: { name: true, code: true }
                        }
                    }
                }
            },
            distinct: ['classSubjectId'],
        });

        for (const mark of allStudentsMarks) {
            const subject = mark.classSubject.subject;
            if (!subjectMap.has(subject.code)) {
                subjectMap.set(subject.code, { name: subject.name, code: subject.code });
            }
        }
        allSubjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    // Helper functions for marks display
    const getExamMarks = (examData: any, isYearly: boolean, subjectCode: string) => {
        if (!examData) return '-';
        const isFortyMarks = false; // Comp01, GK01, DRAW02 are now 30-mark subjects
        const isThirtyMarks = subjectCode.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);

        if (isFortyMarks) {
            return isYearly ? examData.yearlyexamMarks40 ?? '-' : examData.examMarks40 ?? '-';
        } else if (isThirtyMarks) {
            return isYearly ? examData.yearlyexamMarks30 ?? '-' : examData.examMarks30 ?? '-';
        }
        return isYearly ? examData.yearlyexamMarks ?? '-' : examData.examMarks ?? '-';
    };

    const formatMark = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        return Math.round(val);
    };

    return (
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
            {/* TOP */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">
                        All Results (Up to 8th)
                    </h1>
                    <div className="flex items-center gap-2">
                        {filtersSelected && (
                            <>
                                <ClassPdfExportButton
                                    sessionId={parseInt(sessionId!)}
                                    classId={parseInt(classId!)}
                                    sectionId={parseInt(sectionId!)}
                                />
                                <ExcelExportButton
                                    sessionId={parseInt(sessionId!)}
                                    classId={parseInt(classId!)}
                                    sectionId={parseInt(sectionId!)}
                                />
                                <FormContainer
                                    table="result"
                                    type="print"
                                    data={{ classId, sectionId, sessionId: parseInt(sessionId!) }}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        name="sessionId"
                        label="Session"
                        options={sessions.map((session) => ({
                            value: session.id.toString(),
                            label: session.sessioncode,
                        }))}
                    />
                    <Select
                        name="classId"
                        label="Class"
                        options={classes.map((cls) => ({
                            value: cls.id.toString(),
                            label: cls.name,
                        }))}
                    />
                    <Select
                        name="sectionId"
                        label="Section"
                        options={
                            classId
                                ? classes
                                    .find((c) => c.id === parseInt(classId))
                                    ?.sections.map((section) => ({
                                        value: section.id.toString(),
                                        label: section.name,
                                    })) ?? []
                                : []
                        }
                        disabled={!classId}
                    />
                </div>
            </div>

            {/* Results Table */}
            {!filtersSelected ? (
                <div className="mt-8 text-center text-gray-500">
                    <p className="text-lg">Please select Session, Class, and Section to view results</p>
                </div>
            ) : students.length === 0 ? (
                <div className="mt-8 text-center text-gray-500">
                    <p className="text-lg">No students found for the selected filters</p>
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    {/* Per-student marks table */}
                    {students.map((student: any) => {
                        // Build marks by subject code
                        const marksBySubject = new Map<string, any>();
                        for (const mark of student.marksJunior) {
                            marksBySubject.set(mark.classSubject.subject.code, mark);
                        }

                        return (
                            <div key={student.id} className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                                {/* Student header */}
                                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-gray-800">{student.name}</span>
                                        <span className="text-sm text-gray-500">Adm No: {student.admissionno ?? '-'}</span>
                                        <span className="text-sm text-gray-500">{student.Class?.name} - {student.Section?.name}</span>
                                    </div>
                                    <FormContainer
                                        table="resultExport"
                                        type="print"
                                        id={student.id}
                                        data={{ sessionId: parseInt(sessionId!) }}
                                    />
                                </div>

                                {/* Marks table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-blue-50">
                                                <th rowSpan={2} className="border px-2 py-1 text-left font-semibold min-w-[120px]">Subject</th>
                                                <th colSpan={6} className="border px-2 py-1 text-center font-semibold bg-blue-100">TERM 1</th>
                                                <th colSpan={5} className="border px-2 py-1 text-center font-semibold bg-green-100">TERM 2</th>
                                                <th colSpan={2} className="border px-2 py-1 text-center font-semibold bg-yellow-50">Overall</th>
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
                                                        {/* Term 1 */}
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.halfYearly?.ut1)}</td>
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.halfYearly?.ut2)}</td>
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.halfYearly?.noteBook)}</td>
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.halfYearly?.subEnrichment)}</td>
                                                        <td className="border px-1 py-1 text-center">{mark ? getExamMarks(mark.halfYearly, false, subject.code) : '-'}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{formatMark(mark?.halfYearly?.totalMarks)}</td>
                                                        {/* Term 2 */}
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.yearly?.ut3)}</td>
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.yearly?.yearlynoteBook)}</td>
                                                        <td className="border px-1 py-1 text-center">{formatMark(mark?.yearly?.yearlysubEnrichment)}</td>
                                                        <td className="border px-1 py-1 text-center">{mark ? getExamMarks(mark.yearly, true, subject.code) : '-'}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{formatMark(mark?.yearly?.yearlytotalMarks)}</td>
                                                        {/* Overall */}
                                                        <td className="border px-1 py-1 text-center font-semibold">{formatMark(mark?.grandTotalMarks)}</td>
                                                        <td className="border px-1 py-1 text-center font-semibold">{mark?.grandTotalGrade ?? '-'}</td>
                                                    </tr>
                                                );
                                            })}
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
