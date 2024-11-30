"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
  juniorMarkSchema,
  JuniorMarkSchema,
  calculateMarksAndGrade
} from "@/lib/formValidationSchemas";
import { useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { createJuniorMarks, updateJuniorMarks } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { z } from "zod";

const JuniorMarkForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: (open: boolean) => void;
  relatedData: {
    classes: any[];
    sessions: any[]; // Add sessions to related data
  };
}) => {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ marks: JuniorMarkSchema[] }>({
    resolver: zodResolver(
      z.object({
        marks: z.array(juniorMarkSchema)
      })
    ),
    defaultValues: {
      marks: []
    }
  });

  const { fields: markFields } = useFieldArray({
    control,
    name: "marks",
  });

  const [state, formAction] = useFormState(
    type === "create" ? createJuniorMarks : updateJuniorMarks,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  // Effect to handle form submission success
  useEffect(() => {
    if (state.success) {
      toast(`Marks have been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  // Populate students when class and section are selected
  const selectedClassData = relatedData.classes.find(
    (cls) => cls.id === selectedClass
  );

  const selectedSectionStudents = selectedClassData?.sections
    .find((sec: any) => sec.id === selectedSection)
    ?.students || [];

  const selectedClassSubjects = selectedClassData?.classSubjects || [];

  // Submit handler
  const onSubmit = handleSubmit((formData) => {
    console.log("Form submitted", formData); // Log the submitted data
  
    // Validate that all required selections are made
    if (!selectedClass || !selectedSection || !selectedSubject || !selectedSession) {
      toast.error("Please select Class, Section, Subject, and Session");
      return;
    }
  
    // Filter out entries with no marks
    const processedMarks = formData.marks
      .filter(mark =>
        mark.ut1 || mark.ut2 || mark.ut3 || mark.ut4 ||
        mark.noteBook || mark.subEnrichment || mark.examMarks
      )
      .map((mark) => {
        const { totalMarks, grade } = calculateMarksAndGrade(mark); // Calculate total marks and grade
        return {
          ...mark,
          totalMarks, // Add totalMarks to the mark object
          grade, // Add grade to the mark object
          classSubjectId: selectedSubject,
          sessionId: selectedSession, // Add selected session ID
        };
      });
  
    if (processedMarks.length === 0) {
      toast.error("Please enter marks for at least one student");
      return;
    }
  
    console.log("Processed marks:", processedMarks); // Log processed marks
  
    // Call the form action to submit the data
    formAction({ marks: processedMarks });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create Marks Entry" : "Update Marks Entry"}
      </h1>

      {/* Session Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">Select Session</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          onChange={(e) => {
            const sessionId = parseInt(e.target.value);
            setSelectedSession(sessionId);
            setSelectedClass(null);
            setSelectedSection(null);
            setSelectedSubject(null);
          }}
        >
          <option value="">Select a Session</option>
          {relatedData.sessions.map((session: any) => (
            <option key={session.id} value={session.id}>
              {session.sessioncode} {session.isActive ? "(Active)" : ""}
            </option>
          ))}
        </select>
      </div>


      {/* Class Selection (Now dependent on Session) */}
      {selectedSession && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Select Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            onChange={(e) => {
              const classId = parseInt(e.target.value);
              setSelectedClass(classId);
              setSelectedSection(null);
              setSelectedSubject(null);
            }}
          >
            <option value="">Select a Class</option>
            {relatedData.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}



      {/* Section Selection */}
      {selectedClass && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Select Section</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            onChange={(e) => {
              const sectionId = parseInt(e.target.value);
              setSelectedSection(sectionId);
              setSelectedSubject(null);
            }}
          >
            <option value="">Select a Section</option>
            {selectedClassData.sections.map((section: any) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subject Selection */}
      {selectedSection && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Select Subject</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            onChange={(e) => {
              const subjectId = parseInt(e.target.value);
              setSelectedSubject(subjectId);
            }}
          >
            <option value="">Select a Subject</option>
            {selectedClassSubjects.map((cs: any) => (
              <option key={cs.subject.id} value={cs.subject.id}>
                {cs.subject.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Exam Type Selection */}
      {selectedSubject && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Exam Type</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("marks.0.examType")}
          >
            <option value="HALF_YEARLY">Half Yearly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      )}

      {/* Marks Entry Table */}
      {selectedSubject && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Student</th>
                <th className="p-2 border">UT1</th>
                <th className="p-2 border">UT2</th>
                <th className="p-2 border">UT3</th>
                <th className="p-2 border">UT4</th>
                <th className="p-2 border">Notebook</th>
                <th className="p-2 border">Sub Enrichment</th>
                <th className="p-2 border">Exam Marks</th>
                <th className="p-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {selectedSectionStudents.map((student: any, index: number) => (
                <tr key={student.id} className="even:bg-gray-50">
                  <td className="p-2 border">
                    <input
                      type="hidden"
                      {...register(`marks.${index}.studentId`)}
                      value={student.id}
                    />
                    {student.name}
                  </td>
                  {[
                    "ut1",
                    "ut2",
                    "ut3",
                    "ut4",
                    "noteBook",
                    "subEnrichment",
                    "examMarks",
                    "remarks",
                  ].map((field) => (
                    <td key={field} className="p-2 border">
                      <input
                        type={field === "remarks" ? "text" : "number"}
                        step="0.1"
                        className="w-full p-1 border rounded text-sm"
                        {...register(`marks.${index}.${field}` as any)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.error && (
        <span className="text-red-500">
          Something went wrong while saving marks!
        </span>
      )}

      <button
        type="submit"
        className="bg-blue-400 text-white p-2 rounded-md"
        // disabled={!selectedSubject || !selectedSession}
      >
        {type === "create" ? "Create Marks" : "Update Marks"}
      </button>
    </form>
  );
};

export default JuniorMarkForm;