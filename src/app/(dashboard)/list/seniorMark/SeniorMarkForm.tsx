"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import {
  SeniorMarkSchema,
  seniorMarkSchema,
  calculateSeniorMarksAndGrade,
} from "@/lib/formValidationSchemas";
import {
  createSeniorMarks,
  updateSeniorMarks,
  checkExistingSeniorMarks,
} from "./actions";

type SeniorMarkFormProps = {
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
          admissionno: string;
        }>;
        sectionSubjects: Array<{
          id: number;
          subject: {
            id: number;
            name: string;
            code: string;  // Add this field
          };
        }>;
      }>;
    }>;
  };
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const SeniorMarkForm: React.FC<SeniorMarkFormProps> = ({
  type: initialType = "create",
  relatedData,
  setOpen,
}) => {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [formType, setFormType] = useState<"create" | "update">(initialType);
  const [existingMarksData, setExistingMarksData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVocationalIT, setIsVocationalIT] = useState(false);

  const router = useRouter();

  // Filtered data based on selections
  const filteredClasses = useMemo(
    () => relatedData.classes.filter(cls => cls.classNumber === 9),
    [relatedData.classes]
  );

  const selectedClassData = useMemo(
    () => filteredClasses.find((cls) => cls.id === selectedClass) || null,
    [filteredClasses, selectedClass]
  );

  const selectedSectionData = useMemo(
    () => selectedClassData?.sections.find((sec) => sec.id === selectedSection),
    [selectedClassData, selectedSection]
  );

  const selectedSectionStudents = useMemo(
    () => selectedSectionData?.students || [],
    [selectedSectionData]
  );

  const selectedSectionSubjects = useMemo(
    () => selectedSectionData?.sectionSubjects || [],
    [selectedSectionData]
  );

  // Update the useEffect for checking existing marks
  useEffect(() => {
    const checkExistingMarks = async () => {
      if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
        return;
      }

      setIsLoading(true);
      try {
        const result = await checkExistingSeniorMarks({
          sectionSubjectId: selectedSubject,
          sessionId: selectedSession,
        });

        if (result.success && result.data && result.data.length > 0) {
          setExistingMarksData(result.data);
          setFormType("update");
          toast.info("Existing marks found. Switching to update mode.");
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
  }, [selectedSession, selectedClass, selectedSection, selectedSubject]);

  // Form setup
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ marks: SeniorMarkSchema[] }>({
    resolver: zodResolver(
      z.object({
        marks: z.array(seniorMarkSchema),
      })
    ),
    defaultValues: {
      marks: selectedSectionStudents.map((student) => ({
        studentId: student.id,
        sectionSubjectId: selectedSubject || 0,
        sessionId: selectedSession || 0,
        pt1: null,
        pt2: null,
        pt3: null,
        bestTwoPTAvg: null,
        multipleAssessment: null,
        portfolio: null,
        subEnrichment: null,
        bestScore: null,
        finalExam: null,
        grandTotal: null,
        grade: null,
        remarks: null,
        overallTotal: null,
        overallMarks: null,
        overallGrade: null
      }))
    }
  });

  // Add useEffect for managing form data when existing marks are found
  useEffect(() => {
    if (existingMarksData && existingMarksData.length > 0) {
      const updatedMarks = selectedSectionStudents.map((student) => {
        const existingMark = existingMarksData.find(
          (mark) => mark.studentId === student.id
        );

        return {
          studentId: student.id,
          sectionSubjectId: selectedSubject || 0,
          sessionId: selectedSession || 0,
          pt1: existingMark?.pt1 || null,
          pt2: existingMark?.pt2 || null,
          pt3: existingMark?.pt3 || null,
          bestTwoPTAvg: existingMark?.bestTwoPTAvg || null,
          multipleAssessment: existingMark?.multipleAssessment || null,
          portfolio: existingMark?.portfolio || null,
          subEnrichment: existingMark?.subEnrichment || null,
          bestScore: existingMark?.bestScore || null,
          finalExam: existingMark?.finalExam || null,
          grandTotal: existingMark?.grandTotal || null,
          grade: existingMark?.grade || null,
          remarks: existingMark?.remarks || null,
          overallTotal: existingMark?.overallTotal || null,
          overallMarks: existingMark?.overallMarks || null,
          overallGrade: existingMark?.overallGrade || null
        };
      });

      reset({ marks: updatedMarks });
    } else {
      // Reset form with empty values for new entries
      reset({
        marks: selectedSectionStudents.map((student) => ({
          studentId: student.id,
          sectionSubjectId: selectedSubject || 0,
          sessionId: selectedSession || 0,
          pt1: null,
          pt2: null,
          pt3: null,
          bestTwoPTAvg: null,
          multipleAssessment: null,
          portfolio: null,
          subEnrichment: null,
          bestScore: null,
          finalExam: null,
          grandTotal: null,
          grade: null,
          remarks: null,
          overallTotal: null,
          overallMarks: null,
          overallGrade: null
        }))
      });
    }
  }, [existingMarksData, selectedSectionStudents, selectedSubject, selectedSession, reset]);

  // Modified onSubmit function
  const onSubmit = async (formData: { marks: SeniorMarkSchema[] }) => {
    if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
      toast.error("Please select all required fields");
      return;
    }

    try {
      // Filter out empty entries and process marks
      const processedMarks = formData.marks
        .filter(mark => 
          mark.pt1 !== null || 
          mark.pt2 !== null || 
          mark.pt3 !== null || 
          mark.multipleAssessment !== null ||
          mark.portfolio !== null ||
          mark.subEnrichment !== null ||
          mark.finalExam !== null
        )
        .map(mark => ({
          ...mark,
          sectionSubjectId: selectedSubject,
          sessionId: selectedSession
        }));

      if (processedMarks.length === 0) {
        toast.error("Please enter marks for at least one student");
        return;
      }

      const result = formType === "create"
        ? await createSeniorMarks({ marks: processedMarks })
        : await updateSeniorMarks({ marks: processedMarks });

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
        {formType === "create" ? "Create Senior Marks Entry" : "Update Senior Marks Entry"}
      </h2>

      {/* Selection Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Session Selection */}
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
                const subjectId = Number(e.target.value);
                setSelectedSubject(subjectId);
                
                // Check if selected subject has code IT001
                const selectedSubjectData = selectedSectionSubjects.find(
                  ss => ss.id === subjectId
                );
                setIsVocationalIT(
                  selectedSubjectData?.subject.code === "IT001"
                );
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a Subject</option>
              {selectedSectionSubjects.map((ss) => (
                <option key={ss.id} value={ss.id}>
                  {ss.subject.name}
                </option>
              ))}
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
                {isVocationalIT ? (
                  <>
                    <th className="p-2 border">Theory (70)</th>
                    <th className="p-2 border">Practical (30)</th>
                    <th className="p-2 border">Total (100)</th>
                  </>
                ) : (
                  <>
                    <th className="p-2 border">PT1</th>
                    <th className="p-2 border">PT2</th>
                    <th className="p-2 border">PT3</th>
                    <th className="p-2 border">Multiple Assessment</th>
                    <th className="p-2 border">Portfolio</th>
                    <th className="p-2 border">Sub Enrichment</th>
                    <th className="p-2 border">Final Exam</th>
                  </>
                )}
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
                  {isVocationalIT ? (
                    <>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.theory`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.practical`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.total`, { valueAsNumber: true })}
                          disabled
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
                          {...register(`marks.${index}.pt1`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.pt2`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.pt3`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.multipleAssessment`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.portfolio`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.subEnrichment`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full p-1 border rounded text-sm"
                          {...register(`marks.${index}.finalExam`, { valueAsNumber: true })}
                        />
                      </td>
                    </>
                  )}
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.remarks`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Button */}
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

export default SeniorMarkForm;
