"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { format } from 'date-fns';

type TeacherFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: {
    classes?: {
      id: number;
      name: string;
      classNumber: number;
    }[];
  };
};

const TeacherForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: TeacherFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
  });

  const [img, setImg] = useState<any>();

  const [state, formAction] = useFormState(
    type === "create" ? createTeacher : updateTeacher,
    {
      success: false,
      error: false,
    }
  );

  const formatDateForInput = (date: string | Date | undefined) => {
    if (!date) return '';
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const onSubmit = handleSubmit((formData) => {
      if (type === "update") {
        formData.id = data?.id;// Ensure ID is included for updates
    };
    console.log(formData);
    formAction(formData);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Teacher has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new teacher" : "Update the teacher"}
      </h1>

      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors.email}
        />
        {(type === "create" || !data) && (
          <InputField
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors.password}
          />
        )}
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>

      <CldUploadWidget
        uploadPreset="school"
        onSuccess={(result, { widget }) => {
          setImg(result.info);
          widget.close();
        }}
      >
        {({ open }) => (
          <div
            className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
            onClick={() => open()}
          >
            <Image src="/upload.png" alt="Upload" width={28} height={28} />
            <span>{img?.secure_url ? 'Change photo' : 'Upload a photo'}</span>
          </div>
        )}
      </CldUploadWidget>
      
      <div className="flex justify-between flex-wrap gap-4">
        {data?.id && (
          <input type="hidden" {...register("id")} />
        )}
        
        <InputField
          label="Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <InputField
          label="City"
          name="city"
          defaultValue={data?.city}
          register={register}
          error={errors.city}
        />
        <InputField
          label="State"
          name="state"
          defaultValue={data?.state}
          register={register}
          error={errors.state}
        />
        
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Blood Group</label>
          <select
          defaultValue={data?.bloodgroup}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("bloodgroup")}
          >
            <option value="A_plus">A+</option>
            <option value="A_minus">A-</option>
            <option value="B_plus">B+</option>
            <option value="B_minus">B-</option>
            <option value="AB_plus">AB+</option>
            <option value="AB_minus">AB-</option>
            <option value="O_plus">O+</option>
            <option value="O_minus">O-</option>
          </select>
          {errors.bloodgroup && (
            <p className="text-xs text-red-400">{errors.bloodgroup.message?.toString()}</p>
          )}
        </div>

        <InputField
          label="Birthday"
          name="birthday"
          type="date"
          defaultValue={formatDateForInput(data?.birthday)}
          register={register}
          error={errors.birthday}
        />
        <InputField
          label="Joining Date"
          name="joiningdate"
          type="date"
          defaultValue={formatDateForInput(data?.joiningdate)}
          register={register}
          error={errors.joiningdate}
        />
        <InputField
          label="Designation"
          name="designation"
          defaultValue={data?.designation}
          register={register}
          error={errors.designation}
        />
        <InputField
          label="Qualification"
          name="qualification"
          register={register}
          defaultValue={data?.qualification}
          error={errors.qualification}
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
          defaultValue={data?.Sex}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("Sex")}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.Sex && (
            <p className="text-xs text-red-400">{errors.Sex.message?.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Father/Husband</label>
          <select
          defaultValue={data?.FatherHusband}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("FatherHusband")}
          >
            <option value="Father">Father</option>
            <option value="Husband">Husband</option>
          </select>
          {errors.FatherHusband && (
            <p className="text-xs text-red-400">{errors.FatherHusband.message?.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Employee Type</label>
          <select
          defaultValue={data?.EmployeeType}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("EmployeeType")}
          >
            <option value="Permanent">Permanent</option>
            <option value="Temporarily">Temporarily</option>
            <option value="Peon">Peon</option>
          </select>
          {errors.EmployeeType && (
            <p className="text-xs text-red-400">{errors.EmployeeType.message?.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Assigned Class</label>
          <select
            defaultValue={data?.assignedClassId || ""}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("assignedClassId")}
          >
            <option value="">No Class Assigned</option>
            {relatedData?.classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <input 
          type="hidden" 
          {...register("createdAt")} 
        />
      </div>

      {state.error && <span className="text-red-500">Something went wrong!</span>}

      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default TeacherForm;