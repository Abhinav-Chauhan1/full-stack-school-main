"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { getStudentsByClassAndSection, promoteStudents } from "./actions";

type PromoteStudentFormProps = {
  classes: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string; classId: number }>;
  sessions: Array<{ id: number; sessioncode: string }>;
};

export default function PromoteStudentForm({ classes, sections, sessions }: PromoteStudentFormProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const { register, handleSubmit, watch } = useForm();

  const selectedClassId = watch("fromClassId");
  const selectedToClassId = watch("toClassId");
  const filteredSections = sections.filter(
    section => section.classId === Number(selectedClassId)
  );
  const filteredToSections = sections.filter(
    section => section.classId === Number(selectedToClassId)
  );

  const loadStudents = async (data: any) => {
    if (!data.fromClassId || !data.fromSessionId) {
      toast.error("Please select class and session");
      return;
    }

    setIsLoading(true);
    try {
      const result = await getStudentsByClassAndSection(
        Number(data.fromClassId),
        data.fromSectionId ? Number(data.fromSectionId) : null,
        Number(data.fromSessionId)
      );

      if (result.success) {
        setStudents(result.data || []);
        setSelectedStudents([]);
        if (result.data && result.data.length === 0) {
          toast.info("No students found for the selected criteria");
        } else {
          toast.success(`Found ${result.data?.length || 0} student${result.data?.length !== 1 ? 's' : ''}`);
        }
      } else {
        toast.error(result.message);
        setStudents([]);
      }
    } catch (error) {
      toast.error("An error occurred while loading students");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromote = async (data: any) => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students to promote");
      return;
    }

    if (!data.toClassId || !data.toSessionId) {
      toast.error("Please select target class and session");
      return;
    }

    setIsPromoting(true);
    try {
      const result = await promoteStudents(
        selectedStudents,
        Number(data.toClassId),
        data.toSectionId ? Number(data.toSectionId) : null,
        Number(data.toSessionId)
      );

      if (result.success) {
        toast.success(result.message);
        setSelectedStudents([]);
        setStudents([]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("An error occurred while promoting students");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(loadStudents)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Session *</label>
          <select 
            {...register("fromSessionId")} 
            className="mt-1 block w-full rounded-md border p-2"
            disabled={isLoading}
          >
            <option value="">Select Session</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.sessioncode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Class *</label>
          <select 
            {...register("fromClassId")} 
            className="mt-1 block w-full rounded-md border p-2"
            disabled={isLoading}
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Section (Optional)</label>
          <select 
            {...register("fromSectionId")} 
            className="mt-1 block w-full rounded-md border p-2"
            disabled={isLoading || !selectedClassId}
          >
            <option value="">All Sections</option>
            {filteredSections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-full">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Load Students"}
          </button>
        </div>
      </form>

      {students.length > 0 && (
        <form onSubmit={handleSubmit(handlePromote)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To Session *</label>
              <select 
                {...register("toSessionId")} 
                className="mt-1 block w-full rounded-md border p-2"
                disabled={isPromoting}
              >
                <option value="">Select Session</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.sessioncode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">To Class *</label>
              <select 
                {...register("toClassId")} 
                className="mt-1 block w-full rounded-md border p-2"
                disabled={isPromoting}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">To Section (Optional)</label>
              <select 
                {...register("toSectionId")} 
                className="mt-1 block w-full rounded-md border p-2"
                disabled={isPromoting || !selectedToClassId}
              >
                <option value="">Select Section</option>
                {filteredToSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                Select Students to Promote ({selectedStudents.length} of {students.length} selected)
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={isPromoting}
                />
                <span className="text-sm font-medium">Select All</span>
              </label>
            </div>
            <div className="mt-2 space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
              {students.map((student) => (
                <label 
                  key={student.id} 
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                      }
                    }}
                    className="rounded border-gray-300"
                    disabled={isPromoting}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      (Adm: {student.admissionno})
                    </span>
                    {student.Class && (
                      <span className="text-gray-500 text-sm ml-2">
                        - {student.Class.name}
                      </span>
                    )}
                    {student.Section && (
                      <span className="text-gray-500 text-sm">
                        {" "}{student.Section.name}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPromoting || selectedStudents.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPromoting ? "Promoting..." : `Promote ${selectedStudents.length} Selected Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      )}
    </div>
  );
}
