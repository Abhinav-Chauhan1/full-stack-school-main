"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import { 
  saveHigherCoScholastic, 
  checkExistingHigherCoScholastic,
  getHigherCoScholasticData,
  getInitialData 
} from "./actions";

// Define schema for validation
const higherCoScholasticSchema = z.object({
  marks: z.array(z.object({
    higherMarkId: z.number(),
    physicalEducation: z.string().nullable().optional(),
    workExperience: z.string().nullable().optional(),
    discipline: z.string().nullable().optional(),
  }))
});

type HigherCoScholasticSchema = z.infer<typeof higherCoScholasticSchema>;

type HigherCoScholasticFormProps = {
  type: "create" | "update";
  relatedData?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const HigherCoScholasticForm = ({ type = "create", relatedData, setOpen }: HigherCoScholasticFormProps) => {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formType, setFormType] = useState<"create" | "update">(type);
  const [students, setStudents] = useState<Array<{ id: string, higherMarkId: number, name: string, admissionno: string }>>([]);
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
  } = useForm<HigherCoScholasticSchema>({
    resolver: zodResolver(higherCoScholasticSchema),
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
        const studentsData = await getHigherCoScholasticData({
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
          const existingDataResult = await checkExistingHigherCoScholastic({
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
                // Find existing record for this student by higherMarkId
                const existingRecord = existingDataResult.data.find(
                  (record: any) => record.higherMarkId === student.higherMarkId
                );
                
                return {
                  higherMarkId: student.higherMarkId,
                  physicalEducation: existingRecord?.physicalEducation || "",
                  workExperience: existingRecord?.workExperience || "",
                  discipline: existingRecord?.discipline || ""
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
                higherMarkId: student.higherMarkId,
                physicalEducation: "",
                workExperience: "",
                discipline: ""
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

  const onSubmit = async (data: HigherCoScholasticSchema) => {
    try {
      const result = await saveHigherCoScholastic({
        marks: data.marks
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
        <div className="grid grid-cols-3 gap-4 mb-4">
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
                  <th className="p-2 border">Physical Education</th>
                  <th className="p-2 border">Work Experience</th>
                  <th className="p-2 border">Discipline</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} className="even:bg-gray-50">
                    <td className="p-2 border">
                      <input 
                        type="hidden" 
                        {...register(`marks.${index}.higherMarkId`)} 
                        value={student.higherMarkId}
                      />
                      {student.name} ({student.admissionno})
                    </td>
                    <td className="p-2 border">
                      <select 
                        className="w-full p-1 border rounded text-sm"
                        {...register(`marks.${index}.physicalEducation`)}
                      >
                        <option value="">Select Grade</option>
                        {gradeOptions.map(grade => (
                          <option key={`pe-${grade}`} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <select 
                        className="w-full p-1 border rounded text-sm"
                        {...register(`marks.${index}.workExperience`)}
                      >
                        <option value="">Select Grade</option>
                        {gradeOptions.map(grade => (
                          <option key={`we-${grade}`} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <select 
                        className="w-full p-1 border rounded text-sm"
                        {...register(`marks.${index}.discipline`)}
                      >
                        <option value="">Select Grade</option>
                        {gradeOptions.map(grade => (
                          <option key={`disc-${grade}`} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading state and no students message */}
        {isLoading && (
          <div className="text-center py-4">
            <p>Loading students...</p>
          </div>
        )}

        {!isLoading && selectedClass && selectedSection && selectedSession && students.length === 0 && (
          <div className="text-center py-4">
            <p>No students found with higher marks for the selected class, section and session.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading || students.length === 0}
            className="px-4 py-2 bg-lamaPurple text-white rounded-md hover:bg-lamaPurpleDark disabled:bg-gray-300"
          >
            {isSubmitting ? "Saving..." : formType === "create" ? "Create" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HigherCoScholasticForm;
