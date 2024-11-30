"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, ClassSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Select from 'react-select';

const ClassForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: data?.name || "",
      capacity: data?.capacity || "",
      classNumber: data?.classNumber || "",
      subjects: data?.classSubjects?.map((cs: any) => cs.subjectId) || [],
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createClass : updateClass,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Class has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const subjectOptions = relatedData.subjects.map((subject: { id: any; name: any; }) => ({
    value: subject.id,
    label: subject.name,
  }));

  return (
    <>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new class" : "Update the class"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Class name"
          name="name"
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Capacity"
          name="capacity"
          type="number"
          register={register}
          error={errors?.capacity}
        />
        <InputField
          label="Class Number"
          name="classNumber"
          type="number"
          register={register}
          error={errors?.classNumber}
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
        <div className="w-full mb-4">
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
                value={subjectOptions.filter((option: { value: number; }) => field.value.includes(option.value))}
                onChange={(selectedOptions) => field.onChange(selectedOptions.map(option => option.value))}
              />
            )}
          />
          {errors.subjects && <p className="text-red-500">{errors.subjects.message}</p>}
        </div>
      </div>
      <button
        type="submit"
        onClick={onSubmit}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </>
  );
};

export default ClassForm;