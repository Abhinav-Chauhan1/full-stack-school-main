import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import FormContainer from "@/components/FormContainer";

const ViewStudentPage = async ({
    params,
}: {
    params: { id: string };
}) => {
    const { sessionClaims } = auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (role !== "admin" && role !== "teacher") {
        throw new Error("You don't have permission to access this page");
    }

    const student = await prisma.student.findUnique({
        where: { id: params.id },
        include: {
            Class: true,
            Section: true,
            Session: true,
            SubCategory: true,
            // Junior marks (up to 8th) - all sessions
            marksJunior: {
                include: {
                    classSubject: {
                        include: {
                            subject: true,
                            class: true,
                        }
                    },
                    halfYearly: true,
                    yearly: true,
                    coScholastic: true,
                    session: true,
                },
                orderBy: [
                    { session: { sessionfrom: 'desc' } },
                    { classSubject: { subject: { name: 'asc' } } },
                ]
            },
            // Senior marks (class 9-10) - all sessions
            marksSenior: {
                include: {
                    sectionSubject: {
                        include: {
                            subject: true,
                            section: {
                                include: { class: true }
                            }
                        }
                    },
                    session: true,
                    coScholastic: true,
                },
                orderBy: [
                    { session: { sessionfrom: 'desc' } },
                    { sectionSubject: { subject: { name: 'asc' } } },
                ]
            },
            // Higher marks (class 11-12) - all sessions
            markHigher: {
                include: {
                    sectionSubject: {
                        include: {
                            subject: true,
                            section: {
                                include: { class: true }
                            }
                        }
                    },
                    session: true,
                    coScholastic: true,
                },
                orderBy: [
                    { session: { sessionfrom: 'desc' } },
                    { sectionSubject: { subject: { name: 'asc' } } },
                ]
            },
        }
    });

    if (!student) {
        notFound();
    }

    // Helper to format marks
    const fmt = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        return Math.round(val);
    };

    // Group junior marks by session
    const juniorBySession = new Map<string, { sessionCode: string; className: string; marks: typeof student.marksJunior }>();
    for (const mark of student.marksJunior) {
        const key = `${mark.sessionId}`;
        if (!juniorBySession.has(key)) {
            juniorBySession.set(key, {
                sessionCode: mark.session.sessioncode,
                className: mark.classSubject.class?.name ?? '-',
                marks: [],
            });
        }
        juniorBySession.get(key)!.marks.push(mark);
    }

    // Group senior marks by session
    const seniorBySession = new Map<string, { sessionCode: string; className: string; marks: typeof student.marksSenior }>();
    for (const mark of student.marksSenior) {
        const key = `${mark.sessionId}`;
        if (!seniorBySession.has(key)) {
            seniorBySession.set(key, {
                sessionCode: mark.session.sessioncode,
                className: mark.sectionSubject.section?.class?.name ?? '-',
                marks: [],
            });
        }
        seniorBySession.get(key)!.marks.push(mark);
    }

    // Group higher marks by session
    const higherBySession = new Map<string, { sessionCode: string; className: string; marks: typeof student.markHigher }>();
    for (const mark of student.markHigher) {
        const key = `${mark.sessionId}`;
        if (!higherBySession.has(key)) {
            higherBySession.set(key, {
                sessionCode: mark.session.sessioncode,
                className: mark.sectionSubject.section?.class?.name ?? '-',
                marks: [],
            });
        }
        higherBySession.get(key)!.marks.push(mark);
    }

    // Helper for exam marks based on subject type
    const getExamMarks = (examData: any, isYearly: boolean, subjectCode: string) => {
        if (!examData) return '-';
        const isFortyMarks = false; // Comp01, GK01, DRAW02 are now 30-mark subjects
        const isThirtyMarks = subjectCode.match(/^(Urdu01|SAN01|Comp01|GK01|DRAW02|PAI01)$/);
        if (isFortyMarks) return isYearly ? examData.yearlyexamMarks40 ?? '-' : examData.examMarks40 ?? '-';
        if (isThirtyMarks) return isYearly ? examData.yearlyexamMarks30 ?? '-' : examData.examMarks30 ?? '-';
        return isYearly ? examData.yearlyexamMarks ?? '-' : examData.examMarks ?? '-';
    };

    return (
        <div className="flex-1 m-4 mt-0 space-y-6">
            {/* Back button */}
            <Link href="/list/students" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Students
            </Link>

            {/* Student Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                    <h1 className="text-xl font-bold text-white">Student Profile</h1>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Photo */}
                        <div className="flex-shrink-0">
                            <Image
                                src={student.img || "/noAvatar.png"}
                                alt={student.name}
                                width={120}
                                height={120}
                                className="rounded-lg object-cover border-2 border-gray-200"
                                style={{ width: '120px', height: '120px' }}
                            />
                        </div>

                        {/* Details grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                            <div>
                                <span className="text-gray-500 block">Full Name</span>
                                <span className="font-semibold text-gray-800">{student.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Admission No</span>
                                <span className="font-semibold text-gray-800">{student.admissionno ?? '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Admission Date</span>
                                <span className="font-semibold text-gray-800">{student.admissiondate ? formatDate(student.admissiondate) : '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Date of Birth</span>
                                <span className="font-semibold text-gray-800">{formatDate(student.birthday)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Gender</span>
                                <span className="font-semibold text-gray-800">{student.Sex}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Blood Group</span>
                                <span className="font-semibold text-gray-800">{student.bloodgroup?.replace('_', ' ').replace('plus', '+').replace('minus', '-')}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Current Class</span>
                                <span className="font-semibold text-gray-800">{student.Class?.name ?? '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Section</span>
                                <span className="font-semibold text-gray-800">{student.Section?.name ?? '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Session</span>
                                <span className="font-semibold text-gray-800">{student.Session?.sessioncode ?? '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Religion</span>
                                <span className="font-semibold text-gray-800">{student.Religion}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Category</span>
                                <span className="font-semibold text-gray-800">{student.category}{student.SubCategory ? ` (${student.SubCategory.name})` : ''}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Mother Tongue</span>
                                <span className="font-semibold text-gray-800">{student.tongue}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Nationality</span>
                                <span className="font-semibold text-gray-800">{student.nationality}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Aadhaar Card</span>
                                <span className="font-semibold text-gray-800">{student.aadharcard ?? '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">House</span>
                                <span className="font-semibold text-gray-800">{student.house ?? '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Family & Contact Details */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-3">
                    <h2 className="text-lg font-bold text-white">Family & Contact</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                    <div>
                        <span className="text-gray-500 block">Father&apos;s Name</span>
                        <span className="font-semibold text-gray-800">{student.fathername ?? '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Father&apos;s Phone</span>
                        <span className="font-semibold text-gray-800">{student.fphone ?? '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Father&apos;s Occupation</span>
                        <span className="font-semibold text-gray-800">{student.foccupation ?? '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Mother&apos;s Name</span>
                        <span className="font-semibold text-gray-800">{student.mothername ?? '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Mother&apos;s Phone</span>
                        <span className="font-semibold text-gray-800">{student.mphone ?? '-'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Mother&apos;s Occupation</span>
                        <span className="font-semibold text-gray-800">{student.moccupation ?? '-'}</span>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                        <span className="text-gray-500 block">Address</span>
                        <span className="font-semibold text-gray-800">
                            {[student.address, student.village, student.city].filter(Boolean).join(', ') || '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Previous Education */}
            {(student.previousClass || student.school || student.board) && (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3">
                        <h2 className="text-lg font-bold text-white">Previous Education</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                        <div>
                            <span className="text-gray-500 block">Previous Class</span>
                            <span className="font-semibold text-gray-800">{student.previousClass ?? '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">School</span>
                            <span className="font-semibold text-gray-800">{student.school ?? '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Board</span>
                            <span className="font-semibold text-gray-800">{student.board ?? '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Year of Passing</span>
                            <span className="font-semibold text-gray-800">{student.yearofpass ?? '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* TC Details */}
            {student.tc !== null && (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3">
                        <h2 className="text-lg font-bold text-white">Transfer Certificate</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                        <div>
                            <span className="text-gray-500 block">TC Status</span>
                            <span className="font-semibold text-gray-800">{student.tc ? 'Issued' : 'Not Issued'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">TC No</span>
                            <span className="font-semibold text-gray-800">{student.tcNo ?? '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">TC Date</span>
                            <span className="font-semibold text-gray-800">{student.tcdate ? formatDate(student.tcdate) : '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== MARKS HISTORY ==================== */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3">
                    <h2 className="text-lg font-bold text-white">Complete Marks History</h2>
                </div>
                <div className="p-6 space-y-8">

                    {juniorBySession.size === 0 && seniorBySession.size === 0 && higherBySession.size === 0 && (
                        <p className="text-gray-500 text-center py-4">No marks records found for this student.</p>
                    )}

                    {/* ---- Junior Marks (up to 8th) ---- */}
                    {Array.from(juniorBySession.entries()).map(([key, { sessionCode, className, marks }]) => (
                        <div key={key} className="border rounded-lg overflow-hidden">
                            <div className="bg-blue-50 px-4 py-2 flex items-center justify-between">
                                <h3 className="font-semibold text-blue-800">
                                    {className} — Session: {sessionCode}
                                </h3>
                                <FormContainer
                                    table="resultExport"
                                    type="print"
                                    id={student.id}
                                    data={{ sessionId: marks[0]?.sessionId }}
                                />
                            </div>
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
                                        {marks.map((mark) => {
                                            const subjectCode = mark.classSubject.subject.code;
                                            return (
                                                <tr key={mark.id} className="even:bg-gray-50 hover:bg-blue-50">
                                                    <td className="border px-2 py-1 text-left">{mark.classSubject.subject.name}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.halfYearly?.ut1)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.halfYearly?.ut2)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.halfYearly?.noteBook)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.halfYearly?.subEnrichment)}</td>
                                                    <td className="border px-1 py-1 text-center">{getExamMarks(mark.halfYearly, false, subjectCode)}</td>
                                                    <td className="border px-1 py-1 text-center font-semibold">{fmt(mark.halfYearly?.totalMarks)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.yearly?.ut3)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.yearly?.yearlynoteBook)}</td>
                                                    <td className="border px-1 py-1 text-center">{fmt(mark.yearly?.yearlysubEnrichment)}</td>
                                                    <td className="border px-1 py-1 text-center">{getExamMarks(mark.yearly, true, subjectCode)}</td>
                                                    <td className="border px-1 py-1 text-center font-semibold">{fmt(mark.yearly?.yearlytotalMarks)}</td>
                                                    <td className="border px-1 py-1 text-center font-semibold">{fmt(mark.grandTotalMarks)}</td>
                                                    <td className="border px-1 py-1 text-center font-semibold">{mark.grandTotalGrade ?? '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* ---- Senior Marks (9-10) ---- */}
                    {Array.from(seniorBySession.entries()).map(([key, { sessionCode, className, marks }]) => (
                        <div key={key} className="border rounded-lg overflow-hidden">
                            <div className="bg-green-50 px-4 py-2">
                                <h3 className="font-semibold text-green-800">
                                    {className} — Session: {sessionCode}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-green-50">
                                            <th className="border px-2 py-1 text-left font-semibold min-w-[120px]">Subject</th>
                                            <th className="border px-1 py-1 text-center">PT1</th>
                                            <th className="border px-1 py-1 text-center">PT2</th>
                                            <th className="border px-1 py-1 text-center">PT3</th>
                                            <th className="border px-1 py-1 text-center">Best 2 PT Avg</th>
                                            <th className="border px-1 py-1 text-center">MA</th>
                                            <th className="border px-1 py-1 text-center">Portfolio</th>
                                            <th className="border px-1 py-1 text-center">Sub Enr</th>
                                            <th className="border px-1 py-1 text-center">Best Score</th>
                                            <th className="border px-1 py-1 text-center">Final Exam</th>
                                            <th className="border px-1 py-1 text-center font-semibold">Grand Total</th>
                                            <th className="border px-1 py-1 text-center font-semibold">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marks.map((mark) => (
                                            <tr key={mark.id} className="even:bg-gray-50 hover:bg-green-50">
                                                <td className="border px-2 py-1 text-left">{mark.sectionSubject.subject.name}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.pt1)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.pt2)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.pt3)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.bestTwoPTAvg)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.multipleAssessment)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.portfolio)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.subEnrichment)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.bestScore)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.finalExam)}</td>
                                                <td className="border px-1 py-1 text-center font-semibold">{fmt(mark.grandTotal)}</td>
                                                <td className="border px-1 py-1 text-center font-semibold">{mark.grade ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* ---- Higher Marks (11-12) ---- */}
                    {Array.from(higherBySession.entries()).map(([key, { sessionCode, className, marks }]) => (
                        <div key={key} className="border rounded-lg overflow-hidden">
                            <div className="bg-purple-50 px-4 py-2">
                                <h3 className="font-semibold text-purple-800">
                                    {className} — Session: {sessionCode}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-purple-50">
                                            <th className="border px-2 py-1 text-left font-semibold min-w-[120px]">Subject</th>
                                            <th className="border px-1 py-1 text-center">UT1</th>
                                            <th className="border px-1 py-1 text-center">Half Yearly</th>
                                            <th className="border px-1 py-1 text-center">UT2</th>
                                            <th className="border px-1 py-1 text-center">Theory</th>
                                            <th className="border px-1 py-1 text-center">Practical</th>
                                            <th className="border px-1 py-1 text-center">Total W/O</th>
                                            <th className="border px-1 py-1 text-center font-semibold">Grand Total</th>
                                            <th className="border px-1 py-1 text-center font-semibold">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marks.map((mark) => (
                                            <tr key={mark.id} className="even:bg-gray-50 hover:bg-purple-50">
                                                <td className="border px-2 py-1 text-left">{mark.sectionSubject.subject.name}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.unitTest1)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.halfYearly)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.unitTest2)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.theory)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.practical)}</td>
                                                <td className="border px-1 py-1 text-center">{fmt(mark.totalWithout)}</td>
                                                <td className="border px-1 py-1 text-center font-semibold">{fmt(mark.grandTotal)}</td>
                                                <td className="border px-1 py-1 text-center font-semibold">{mark.grade ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};

export default ViewStudentPage;
