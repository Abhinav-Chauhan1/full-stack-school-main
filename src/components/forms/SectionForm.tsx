"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { sectionSchema, SectionSchema } from "@/lib/formValidationSchemas";
import { createSection, updateSection } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import InputField from "../InputField";
import { Class, Subject } from "@prisma/client";
import Select from 'react-select';

interface SectionFormProps {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData: {
    classes: Class[];
    subjects: Subject[];
  };
}

const SectionForm = ({ type, data, setOpen, relatedData }: SectionFormProps) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SectionSchema>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      name: data?.name || "",
      classId: data?.classId || "",
      subjects: data?.sectionSubjects?.map((ss: any) => ss.subject.id) || [],
    },
  });

  const watchClassId = watch("classId");

  useEffect(() => {
    const selectedClass = relatedData.classes.find(c => c.id === Number(watchClassId));
    setSelectedClass(selectedClass || null);
  }, [watchClassId, relatedData.classes]);

  const [state, formAction] = useFormState(
    type === "create" ? createSection : updateSection,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((formData) => {
    const sanitizedData = {
      ...formData,
      id: data?.id,
    };
    formAction(sanitizedData);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      console.log('State changed:', state);
      toast(`Section has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error('An error occurred');
    }
  }, [state, router, type, setOpen]);

  const subjectOptions = relatedData.subjects.map(subject => ({
    value: subject.id,
    label: `${subject.name} (${subject.code})`,
  }));

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new section" : "Update the section"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Section Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        
        <div className="flex flex-col gap-2 w-full">
          <label htmlFor="classId">Class</label>
          <select
            id="classId"
            {...register("classId")}
            defaultValue={data?.classId}
            className="p-2 border rounded-md"
          >
            <option value="">Select a class</option>
            {relatedData.classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          {errors.classId && (
            <span className="text-red-500">{errors.classId.message}</span>
          )}
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700">Subjects</label>
          <Controller
            name="subjects"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                isMulti
                options={subjectOptions}
                className="basic-multi-select"
                classNamePrefix="select"
                value={subjectOptions.filter(option => (field.value ?? []).includes(option.value))}
                onChange={(selectedOptions) => field.onChange(selectedOptions.map(option => option.value))}
              />
            )}
          />
          {errors.subjects && <p className="text-red-500">{errors.subjects.message}</p>}
        </div>
      </div>

      {state.error && <span className="text-red-500">Something went wrong!</span>}

      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default SectionForm;