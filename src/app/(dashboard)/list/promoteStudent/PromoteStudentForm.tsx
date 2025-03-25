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
    const result = await getStudentsByClassAndSection(
      Number(data.fromClassId),
      data.fromSectionId ? Number(data.fromSectionId) : null,
      Number(data.fromSessionId)
    );

    if (result.success) {
      setStudents(result.data || []);
    } else {
      toast.error(result.message);
    }
  };

  const handlePromote = async (data: any) => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students to promote");
      return;
    }

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
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(loadStudents)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Session</label>
          <select {...register("fromSessionId")} className="mt-1 block w-full rounded-md border p-2">
            <option value="">Select Session</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.sessioncode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Class</label>
          <select {...register("fromClassId")} className="mt-1 block w-full rounded-md border p-2">
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Section</label>
          <select {...register("fromSectionId")} className="mt-1 block w-full rounded-md border p-2">
            <option value="">Select Section</option>
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
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Load Students
          </button>
        </div>
      </form>

      {students.length > 0 && (
        <form onSubmit={handleSubmit(handlePromote)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To Session</label>
              <select {...register("toSessionId")} className="mt-1 block w-full rounded-md border p-2">
                <option value="">Select Session</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.sessioncode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">To Class</label>
              <select {...register("toClassId")} className="mt-1 block w-full rounded-md border p-2">
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">To Section</label>
              <select {...register("toSectionId")} className="mt-1 block w-full rounded-md border p-2">
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
            <h3 className="text-lg font-medium">Select Students to Promote</h3>
            <div className="mt-2 space-y-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center space-x-2">
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
                  />
                  <span>{student.name} - {student.admissionno}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Promote Selected Students
          </button>
        </form>
      )}
    </div>
  );
}
