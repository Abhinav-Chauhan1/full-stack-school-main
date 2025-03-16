"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import { 
  saveJuniorCoScholastic, 
  checkExistingJuniorCoScholastic,
  getJuniorCoScholasticData,
  getInitialData 
} from "./actions";

// Define schema for validation
const juniorCoScholasticSchema = z.object({
  marks: z.array(z.object({
    juniorMarkId: z.string(),
    term1ValueEducation: z.string().nullable().optional(),
    term1PhysicalEducation: z.string().nullable().optional(),
    term1ArtCraft: z.string().nullable().optional(),
    term1Discipline: z.string().nullable().optional(),
    term2ValueEducation: z.string().nullable().optional(),
    term2PhysicalEducation: z.string().nullable().optional(),
    term2ArtCraft: z.string().nullable().optional(),
    term2Discipline: z.string().nullable().optional(),
  }))
});

type JuniorCoScholasticSchema = z.infer<typeof juniorCoScholasticSchema>;

type JuniorCoScholasticFormProps = {
  type: "create" | "update";
  relatedData?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const JuniorCoScholasticForm = ({ type = "create", relatedData, setOpen }: JuniorCoScholasticFormProps) => {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [term, setTerm] = useState<"TERM1" | "TERM2">("TERM1");
  const [isLoading, setIsLoading] = useState(false);
  const [formType, setFormType] = useState<"create" | "update">(type);
  const [students, setStudents] = useState<Array<{ id: string, juniorMarkId: string, name: string, admissionno: string }>>([]);
  const [sessions, setSessions] = useState<Array<{ id: number, sessioncode: string, isActive: boolean }>>([]);
  const [classes, setClasses] = useState<Array<{ id: number, name: string, sections: Array<{ id: number, name: string }> }>>([]);
  const [existingData, setExistingData] = useState<any[] | null>(null);

  const router = useRouter();

  // Initialize form with react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JuniorCoScholasticSchema>({
    resolver: zodResolver(juniorCoScholasticSchema),
    defaultValues: {
      marks: []
    }
  });

  // Use relatedData if provided, otherwise fetch initial data
  useEffect(() => {
    if (relatedData) {
      setSessions(relatedData.sessions || []);
      setClasses(relatedData.classes || []);
    } else {
      const fetchInitialData = async () => {
        try {
          setIsLoading(true);
          const data = await getInitialData();
          
          if (data.success) {
            setSessions(data.sessions || []);
            setClasses(data.classes || []);
          } else {
            toast.error(data.message || "Failed to load initial data");
          }
        } catch (error) {
          console.error("Error fetching initial data:", error);
          toast.error("Failed to load initial data");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchInitialData();
    }
  }, [relatedData]);

  // Fetch students when class and section are selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSection || !selectedSession) return;

      setIsLoading(true);
      try {
        // Get students data
        const studentsData = await getJuniorCoScholasticData({
          classId: selectedClass,
          sectionId: selectedSection,
          sessionId: selectedSession
        });
        
        if (studentsData.success && studentsData.students) {
          // Convert admission numbers from number to string to match the state type
          const formattedStudents = studentsData.students.map(student => ({
            ...student,
            admissionno: student.admissionno.toString()
          }));
          setStudents(formattedStudents);
          
          // Check for existing data
          const existingDataResult = await checkExistingJuniorCoScholastic({
            classId: selectedClass,
            sectionId: selectedSection,
            sessionId: selectedSession
          });
          
          if (existingDataResult.success && existingDataResult.data && existingDataResult.data.length > 0) {
            setExistingData(existingDataResult.data);
            setFormType("update");
            toast.info("Existing co-scholastic data found. Switched to update mode.");
            
            // Create form values with existing data
            const formValues = {
              marks: formattedStudents.map(student => {
                // Find existing record for this student by juniorMarkId
                const existingRecord = existingDataResult.data.find(
                  (record: any) => record.juniorMarkId === student.juniorMarkId
                );
                
                return {
                  juniorMarkId: student.juniorMarkId,
                  term1ValueEducation: existingRecord?.term1ValueEducation || "",
                  term1PhysicalEducation: existingRecord?.term1PhysicalEducation || "",
                  term1ArtCraft: existingRecord?.term1ArtCraft || "",
                  term1Discipline: existingRecord?.term1Discipline || "",
                  term2ValueEducation: existingRecord?.term2ValueEducation || "",
                  term2PhysicalEducation: existingRecord?.term2PhysicalEducation || "",
                  term2ArtCraft: existingRecord?.term2ArtCraft || "",
                  term2Discipline: existingRecord?.term2Discipline || ""
                };
              })
            };
            
            // Reset the form with the existing data
            reset(formValues);
          } else {
            setExistingData(null);
            setFormType("create");
            
            // Initialize empty form for create mode
            reset({
              marks: formattedStudents.map((student: any) => ({
                juniorMarkId: student.juniorMarkId,
                term1ValueEducation: "",
                term1PhysicalEducation: "",
                term1ArtCraft: "",
                term1Discipline: "",
                term2ValueEducation: "",
                term2PhysicalEducation: "",
                term2ArtCraft: "",
                term2Discipline: "",
              }))
            });
          }
        } else {
          toast.error(studentsData.message || "Failed to load students");
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection, selectedSession, reset]);

  const onSubmit = async (data: JuniorCoScholasticSchema) => {
    try {
      const result = await saveJuniorCoScholastic({
        marks: data.marks,
        term
      });

      if (result.success) {
        toast.success(`Co-scholastic data ${formType === "create" ? "created" : "updated"} successfully!`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save co-scholastic data");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const gradeOptions = ["A", "B", "C"];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Session Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Session
            </label>
            <select
              value={selectedSession || ""}
              onChange={(e) => {
                setSelectedSession(Number(e.target.value) || null);
                setSelectedClass(null);
                setSelectedSection(null);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a Session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.sessioncode} {session.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Term Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as "TERM1" | "TERM2")}
              className="w-full p-2 border rounded"
            >
              <option value="TERM1">Term I</option>
              <option value="TERM2">Term II</option>
            </select>
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass || ""}
              onChange={(e) => {
                setSelectedClass(Number(e.target.value) || null);
                setSelectedSection(null);
              }}
              className="w-full p-2 border rounded"
              disabled={!selectedSession}
            >
              <option value="">Select a Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Section
            </label>
            <select
              value={selectedSection || ""}
              onChange={(e) => setSelectedSection(Number(e.target.value) || null)}
              className="w-full p-2 border rounded"
              disabled={!selectedClass}
            >
              <option value="">Select a Section</option>
              {selectedClass &&
                classes
                  .find((cls) => cls.id === selectedClass)
                  ?.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Grades Entry Table */}
        {students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Student</th>
                  {term === "TERM1" ? (
                    <>
                      <th className="p-2 border">Value Education</th>
                      <th className="p-2 border">Physical Education</th>
                      <th className="p-2 border">Art & Craft</th>
                      <th className="p-2 border">Discipline</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 border">Value Education</th>
                      <th className="p-2 border">Physical Education</th>
                      <th className="p-2 border">Art & Craft</th>
                      <th className="p-2 border">Discipline</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} className="even:bg-gray-50">
                    <td className="p-2 border">
                      <input 
                        type="hidden" 
                        {...register(`marks.${index}.juniorMarkId`)} 
                        value={student.juniorMarkId}
                      />
                      {student.name} ({student.admissionno})
                    </td>
                    {term === "TERM1" ? (
                      <>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term1ValueEducation`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term1PhysicalEducation`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term1ArtCraft`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term1Discipline`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term2ValueEducation`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term2PhysicalEducation`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term2ArtCraft`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select 
                            className="w-full p-1 border rounded text-sm"
                            {...register(`marks.${index}.term2Discipline`)}
                          >
                            <option value="">Select Grade</option>
                            {gradeOptions.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
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
              ? "Loading..."
              : isSubmitting
              ? "Submitting..."
              : formType === "create"
              ? "Save Grades"
              : "Update Grades"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JuniorCoScholasticForm;
