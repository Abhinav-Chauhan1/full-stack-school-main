"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Import types and schemas
import {
  JuniorMarkSchema,
  juniorMarkSchema,
  calculateMarksAndGrade,
} from "@/lib/formValidationSchemas";
import {
  createJuniorMarks,
  updateJuniorMarks,
  checkExistingJuniorMarks,
} from '@/app/(dashboard)/list/juniorMark/actions'

// Props type for the form
type JuniorMarkFormProps = {
  type?: "create" | "update";
  relatedData: {
    sessions: Array<{
      id: number;
      sessioncode: string;
      isActive: boolean;
    }>;
    classes: Array<{
      id: number;
      name: string;
      classNumber: number;
      sections: Array<{
        id: number;
        name: string;
        students: Array<{
          id: string;
          name: string;
        }>;
      }>;
      classSubjects: Array<{
        id: number;
        subject: {
          id: number;
          name: string;
        };
      }>;
    }>;
    userRole?: string;
    assignedClass?: string;
    existingMarks?: any[];
  };
  initialData?: any; // Optional initial data for update
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const JuniorMarkForm: React.FC<JuniorMarkFormProps> = ({
  type: initialType = "create",
  relatedData,
  initialData,
  setOpen,
}) => {
  // State for form selections
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [examType, setExamType] = useState<"HALF_YEARLY" | "YEARLY">(
    "HALF_YEARLY"
  );
  const [formType, setFormType] = useState<"create" | "update">(initialType);
  const [existingMarksData, setExistingMarksData] = useState<any[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  // Extract role and assigned class from relatedData
  const userRole = relatedData.userRole || "teacher";
  const assignedClassStr = relatedData.assignedClass || "";
  const assignedClass = assignedClassStr.match(/^(Nursery|KG|UKG)$/)
    ? assignedClassStr
    : parseInt(assignedClassStr.replace("Class ", "")) || undefined;

  // Filtered data based on selections
  const filteredClasses = useMemo(
    () =>
      relatedData.classes.filter((cls) => {
        if (userRole === "admin") {
          return true;
        }

        if (userRole === "teacher" && assignedClass) {
          if (typeof assignedClass === "number") {
            return cls.classNumber === assignedClass;
          }
          return cls.name === assignedClass;
        }

        return false;
      }),
    [relatedData.classes, userRole, assignedClass]
  );

  const selectedClassData = useMemo(
    () => filteredClasses.find((cls) => cls.id === selectedClass) || null,
    [filteredClasses, selectedClass]
  );

  const selectedSectionStudents = useMemo(
    () =>
      selectedClassData?.sections.find((sec) => sec.id === selectedSection)
        ?.students || [],
    [selectedClassData, selectedSection]
  );

  const selectedClassSubjects = useMemo(
    () => selectedClassData?.classSubjects || [],
    [selectedClassData]
  );

  // Update the useEffect for checking existing marks
  useEffect(() => {
    const checkExistingMarks = async () => {
      if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
        return;
      }
  
      setIsLoading(true);
      try {
        const result = await checkExistingJuniorMarks({
          classSubjectId: selectedSubject,
          sessionId: selectedSession,
          sectionId: selectedSection, // Pass sectionId
          examType: examType,
        });
  
        if (result.success && result.data && result.data.length > 0) {
          const hasExamTypeData = result.data.some((mark) =>
            examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly
          );
  
          if (hasExamTypeData) {
            setExistingMarksData(result.data);
            setFormType("update");
            toast.info(`Existing ${examType.toLowerCase().replace('_', ' ')} marks found. Switching to update mode.`);
          } else {
            setExistingMarksData(null);
            setFormType("create");
          }
        } else {
          setExistingMarksData(null);
          setFormType("create");
        }
      } catch (error) {
        console.error("Error checking existing marks:", error);
        toast.error("Failed to check existing marks");
      } finally {
        setIsLoading(false);
      }
    };
  
    checkExistingMarks();
  }, [selectedSession, selectedClass, selectedSection, selectedSubject, examType]);

  // Form setup with updated schema to match new database structure
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ marks: JuniorMarkSchema[] }>({
    resolver: zodResolver(
      z.object({
        marks: z.array(juniorMarkSchema),
      })
    ),
    defaultValues: {
      marks: selectedSectionStudents.map((student) => ({
        studentId: student.id,
        classSubjectId: selectedSubject || 0,
        sessionId: selectedSession || 0,
        examType: examType,
        halfYearly: examType === "HALF_YEARLY" ? {
          ut1: null,
          ut2: null,
          noteBook: null,
          subEnrichment: null,
          examMarks: null,
          totalMarks: null,
          grade: null,
          remarks: null
        } : null,
        yearly: examType === "YEARLY" ? {
          ut3: null,
          ut4: null,
          yearlynoteBook: null,
          yearlysubEnrichment: null,
          yearlyexamMarks: null,
          yearlytotalMarks: null,
          yearlygrade: null,
          yearlyremarks: null
        } : null,
        grandTotalMarks: null,
        grandTotalGrade: null,
        overallPercentage: null
      }))
    }
  });

  const defaultValues = useMemo(() => ({
    marks: selectedSectionStudents.map((student) => ({
      studentId: student.id,
      classSubjectId: selectedSubject || 0, // Use selectedSubject directly
      sessionId: selectedSession || 0,
      examType: examType,
      halfYearly: examType === "HALF_YEARLY" ? {
        ut1: null,
        ut2: null,
        noteBook: null,
        subEnrichment: null,
        examMarks: null,
        totalMarks: null,
        grade: null,
        remarks: null
      } : null,
      yearly: examType === "YEARLY" ? {
        ut3: null,
        ut4: null,
        yearlynoteBook: null,
        yearlysubEnrichment: null,
        yearlyexamMarks: null,
        yearlytotalMarks: null,
        yearlygrade: null,
        yearlyremarks: null
      } : null,
      grandTotalMarks: null,
      grandTotalGrade: null,
      overallPercentage: null
    }))
  }), [selectedSectionStudents, selectedSubject, selectedSession, examType]);

  // Update form when defaultValues change
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Update useEffect to reset form with new mark structure
  useEffect(() => {
    if (existingMarksData && existingMarksData.length > 0) {
      // If marks exist for the selected exam type, switch to update mode
      setFormType("update");
      toast.info(`Existing ${examType.toLowerCase().replace('_', ' ')} marks found. Switching to update mode.`);
      
      const updatedMarks = selectedSectionStudents.map((student) => {
        const existingMark = existingMarksData.find(
          (mark) => mark.studentId === student.id
        );

        return {
          studentId: student.id,
          classSubjectId: selectedSubject || 0,
          sessionId: selectedSession || 0,
          examType: examType,
          halfYearly: examType === "HALF_YEARLY" ? {
            ut1: existingMark?.halfYearly?.ut1,
            ut2: existingMark?.halfYearly?.ut2,
            noteBook: existingMark?.halfYearly?.noteBook,
            subEnrichment: existingMark?.halfYearly?.subEnrichment,
            examMarks: existingMark?.halfYearly?.examMarks,
            totalMarks: existingMark?.halfYearly?.totalMarks,
            grade: existingMark?.halfYearly?.grade,
            remarks: existingMark?.halfYearly?.remarks
          } : null,
          yearly: examType === "YEARLY" ? {
            ut3: existingMark?.yearly?.ut3,
            ut4: existingMark?.yearly?.ut4,
            yearlynoteBook: existingMark?.yearly?.yearlynoteBook,
            yearlysubEnrichment: existingMark?.yearly?.yearlysubEnrichment,
            yearlyexamMarks: existingMark?.yearly?.yearlyexamMarks,
            yearlytotalMarks: existingMark?.yearly?.yearlytotalMarks,
            yearlygrade: existingMark?.yearly?.yearlygrade,
            yearlyremarks: existingMark?.yearly?.yearlyremarks
          } : null,
          grandTotalMarks: existingMark?.grandTotalMarks,
          grandTotalGrade: existingMark?.grandTotalGrade,
          overallPercentage: existingMark?.overallPercentage
        };
      });

      reset({ marks: updatedMarks });
    } else {
      // If no marks exist for the selected exam type, switch to create mode
      setFormType("create");
      reset(defaultValues);
    }
  }, [existingMarksData, selectedSectionStudents, examType, selectedSubject, selectedSession, reset, defaultValues]);

  const { fields } = useFieldArray({
    control,
    name: "marks",
  });

  // Updated submit handler to match new schema
  const onSubmit = async (formData: { marks: JuniorMarkSchema[] }) => {
    if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
      toast.error("Please select all required fields");
      return;
    }
  
    try {
      // Process marks and calculate grades
      const processedMarks = formData.marks.map(async (mark) => {
        // First, get existing marks if we're in yearly exam
        let existingHalfYearlyMarks = null;
        if (mark.examType === "YEARLY") {
          const existingMarks = existingMarksData?.find(
            (existing) => existing.studentId === mark.studentId
          );
          existingHalfYearlyMarks = existingMarks?.halfYearly || null;
        }
  
        // Calculate current term's marks
        const calculatedResults = calculateMarksAndGrade({
          examType: mark.examType,
          [mark.examType === "HALF_YEARLY" ? "halfYearly" : "yearly"]: 
            mark.examType === "HALF_YEARLY" ? mark.halfYearly : mark.yearly,
          halfYearly: existingHalfYearlyMarks // Pass existing half yearly marks for grand total calculation
        });
  
        return {
          ...mark,
          classSubjectId: selectedSubject,
          ...calculatedResults
        };
      });
  
      const resolvedMarks = await Promise.all(processedMarks);
      
      const result = formType === "create"
        ? await createJuniorMarks({ marks: resolvedMarks })
        : await updateJuniorMarks({ marks: resolvedMarks });
  
      if (result.success) {
        toast.success(`Marks ${formType === "create" ? "created" : "updated"} successfully!`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save marks");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <h2 className="text-xl font-semibold mb-4">
        {formType === "create" ? "Create Marks Entry" : "Update Marks Entry"}
      </h2>

      {/* Session Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Session
          </label>
          <select
            value={selectedSession || ""}
            onChange={(e) => {
              setSelectedSession(Number(e.target.value));
              setSelectedClass(null);
              setSelectedSection(null);
              setSelectedSubject(null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a Session</option>
            {relatedData.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.sessioncode} {session.isActive ? "(Active)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selection */}
        {selectedSession && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass || ""}
              onChange={(e) => {
                setSelectedClass(Number(e.target.value));
                setSelectedSection(null);
                setSelectedSubject(null);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a Class</option>
              {filteredClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Section Selection */}
        {selectedClass && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Section
            </label>
            <select
              value={selectedSection || ""}
              onChange={(e) => {
                setSelectedSection(Number(e.target.value));
                setSelectedSubject(null);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a Section</option>
              {selectedClassData?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subject Selection */}
        {selectedSection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject || ""}
              onChange={(e) => {
                setSelectedSubject(Number(e.target.value));
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a Subject</option>
              {selectedClassSubjects.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.subject.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Exam Type Selection */}
        {selectedSubject && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type
            </label>
            <select
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value as "HALF_YEARLY" | "YEARLY")
              }
              className="w-full p-2 border rounded"
            >
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        )}
      </div>

      {/* Marks Entry Table */}
      {selectedSubject && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Student</th>
                {examType === "HALF_YEARLY" ? (
                  <>
                    <th className="p-2 border">UT1 (10)</th>
                    <th className="p-2 border">UT2 (10)</th>
                  </>
                ) : (
                  <>
                    <th className="p-2 border">UT3 (10)</th>
                    <th className="p-2 border">UT4 (10)</th>
                  </>
                )}
                <th className="p-2 border">Notebook (5)</th>
                <th className="p-2 border">Sub Enrichment (5)</th>
                <th className="p-2 border">Exam Marks (80)</th>
                <th className="p-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {selectedSectionStudents.map((student, index) => (
                <tr key={student.id} className="even:bg-gray-50">
                  <td className="p-2 border">
                    <input
                      type="hidden"
                      {...register(`marks.${index}.studentId`)}
                      value={student.id}
                    />
                    {student.name}
                  </td>
                  {examType === "HALF_YEARLY" ? (
                    <>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.ut1`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.ut2`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.noteBook`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.subEnrichment`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.examMarks`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.halfYearly.remarks`)}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.ut3`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.ut4`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.yearlynoteBook`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.yearlysubEnrichment`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.yearlyexamMarks`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.yearly.yearlyremarks`)}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
            isSubmitting || isLoading ? "opacity-50" : ""
          }`}
        >
          {isLoading
            ? "Checking Existing Marks..."
            : isSubmitting
            ? "Submitting..."
            : formType === "create"
            ? "Create Marks"
            : "Update Marks"}
        </button>
      </div>
    </form>
  );
};

export default JuniorMarkForm;