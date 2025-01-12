"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import {
  HigherMarkSchema,
  higherMarkSchema,
} from "@/lib/formValidationSchemas";
import {
  createHigherMarks,
  updateHigherMarks,
  checkExistingHigherMarks,
} from "@/app/(dashboard)/list/higherMark/actions";

type HigherMarkFormProps = {
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
          };
        }>;
      }>;
    }>;
  };
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const HigherMarkForm: React.FC<HigherMarkFormProps> = ({
  type: initialType = "create",
  relatedData,
  setOpen,
}) => {
  // State management
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [formType, setFormType] = useState<"create" | "update">(initialType);
  const [existingMarksData, setExistingMarksData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  // Filter classes for 11th and 12th only
  const filteredClasses = useMemo(
    () => relatedData.classes.filter(cls => cls.classNumber >= 11),
    [relatedData.classes]
  );

  // Add filtered data selectors
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

  // Add useEffect for checking existing marks
  useEffect(() => {
    const checkExistingMarks = async () => {
      if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
        return;
      }

      setIsLoading(true);
      try {
        const result = await checkExistingHigherMarks({
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{ marks: HigherMarkSchema[] }>({
    resolver: zodResolver(
      z.object({
        marks: z.array(higherMarkSchema),
      })
    ),
  });

  // Update form data when students/selections change
  useEffect(() => {
    const getDefaultValues = () => {
      const values = selectedSectionStudents.map((student) => ({
        studentId: student.id,
        sectionSubjectId: selectedSubject || 0,
        sessionId: selectedSession || 0,
        unitTest1: null,
        halfYearly: null,
        unitTest2: null,
        theory: null,
        practical: null,
        totalWithout: null,
        grandTotal: null,
        total: null,
        percentage: null,
        grade: null,
        overallGrade: null,
        remarks: "" // Add this field
      }));
      return { marks: values };
    };

    reset(getDefaultValues());
  }, [selectedSectionStudents, selectedSubject, selectedSession, reset]);

  // Add effect to handle existing marks data
  useEffect(() => {
    if (existingMarksData?.length) {
      const updatedMarks = selectedSectionStudents.map((student) => {
        const existing = existingMarksData.find(m => m.studentId === student.id);
        return {
          studentId: student.id,
          sectionSubjectId: selectedSubject!,
          sessionId: selectedSession!,
          unitTest1: existing?.unitTest1 ?? null,
          halfYearly: existing?.halfYearly ?? null,
          unitTest2: existing?.unitTest2 ?? null,
          theory: existing?.theory ?? null,
          practical: existing?.practical ?? null,
          totalWithout: existing?.totalWithout ?? null,
          grandTotal: existing?.grandTotal ?? null,
          total: existing?.total ?? null,
          percentage: existing?.percentage ?? null,
          grade: existing?.grade ?? null,
          overallGrade: existing?.overallGrade ?? null,
          remarks: existing?.remarks ?? "" // Add this field
        };
      });
      reset({ marks: updatedMarks });
    }
  }, [existingMarksData, selectedSectionStudents, selectedSubject, selectedSession, reset]);

  // Form submission handler
  const onSubmit = async (formData: { marks: HigherMarkSchema[] }) => {
    if (!selectedSession || !selectedClass || !selectedSection || !selectedSubject) {
      toast.error("Please select all required fields");
      return;
    }

    try {
      const processedMarks = formData.marks
        .filter(mark => 
          mark.unitTest1 !== null || 
          mark.halfYearly !== null || 
          mark.unitTest2 !== null ||
          mark.theory !== null ||
          mark.practical !== null
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
        ? await createHigherMarks({ marks: processedMarks })
        : await updateHigherMarks({ marks: processedMarks });

      if (result.success) {
        toast.success(`Marks ${formType === "create" ? "created" : "updated"} successfully`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save marks");
      }
    } catch (error) {
      console.error("Error submitting marks:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <h2 className="text-xl font-semibold mb-4">
        {formType === "create" ? "Create Higher Marks Entry" : "Update Higher Marks Entry"}
      </h2>

      {/* Selection Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                setSelectedSubject(Number(e.target.value));
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
                <th className="p-2 border">Unit Test 1 (10)</th>
                <th className="p-2 border">Half Yearly (30)</th>
                <th className="p-2 border">Unit Test 2 (10)</th>
                <th className="p-2 border">Theory (35)</th>
                <th className="p-2 border">Practical (15)</th>
                <th className="p-2 border">Remarks</th> {/* Add this column */}
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
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.1"
                      max="10"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.unitTest1`, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.1"
                      max="30"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.halfYearly`, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.1"
                      max="10"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.unitTest2`, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.1"
                      max="35"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.theory`, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.1"
                      max="15"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.practical`, { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full p-1 border rounded text-sm"
                      {...register(`marks.${index}.remarks`)}
                      placeholder="Add remarks"
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

export default HigherMarkForm;
