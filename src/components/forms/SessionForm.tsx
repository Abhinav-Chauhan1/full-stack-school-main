"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { sessionSchema, SessionSchema } from "@/lib/formValidationSchemas";
import { createSession, updateSession } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { format } from 'date-fns';

const SessionForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData: any;
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SessionSchema>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      isActive: data?.isActive || false,
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createSession : updateSession,
    {
      success: false,
      error: false,

    }
  );

  const formatDateForInput = (date: string | Date | undefined) => {
    if (!date) return '';
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction({ ...data, id: data.id ?? 0 });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Session has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  return (
    <>
    <h1 className="text-xl font-semibold">
      {type === "create" ? "Create a new class" : "Update the class"}
    </h1>

    <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Session From"
          name="sessionfrom"
          type="date"
          defaultValue={formatDateForInput(data?.sessionfrom)}
          register={register}
          error={errors.sessionfrom}
        />
        
        <InputField
          label="Session To"
          name="sessionto"
          type="date"
          defaultValue={formatDateForInput(data?.sessionto)}
          register={register}
          error={errors.sessionto}
        />
        
        <InputField
          label="Session Code"
          name="sessioncode"
          defaultValue={data?.sessioncode}
          register={register}
          error={errors.sessioncode}
        />
        
        <InputField
          label="Description"
          name="description"
          defaultValue={data?.description}
          register={register}
          error={errors.description}
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active Session
          </label>
        </div>
      </div>

      {state.error && (
        <div className="text-red-500 bg-red-50 p-3 rounded-md">
          {state.message || "Something went wrong!"}
        </div>
      )}

      <div className="flex justify-end gap-4">
      <button
        type="submit"
        onClick={onSubmit}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
      </div>
    </>
  );
};

export default SessionForm;