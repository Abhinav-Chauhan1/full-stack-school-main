"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { useFormState } from "react-dom";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import ExcelUpload from "@/lib/excelUpload";

const StudentForm = ({
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
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [img, setImg] = useState<any>();
  const [state, formAction] = useFormState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    formAction({ ...data, img: img?.secure_url });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Student has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { classes, sections, sessions } = relatedData;

  return (
    <form className="flex flex-col  gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new student" : "Update the student"}
      </h1>



      <span className="text-xs text-gray-400 font-medium">
        Admission Information
      </span>
      <div className="flex justify-between  flex-wrap gap-4">
        <InputField
          label="Admission Date"
          name="admissiondate"
          type="date"
          defaultValue={data?.admissiondate?.toISOString().split("T")[0]}
          register={register}
          error={errors?.admissiondate}
        />
        <InputField
          label="Admission Number"
          name="admissionno"
          type="number"
          defaultValue={data?.admissionno}
          register={register}
          error={errors?.admissionno}
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
            <Image src="/upload.png" alt="" width={28} height={28} />
            <span>Upload a photo</span>
          </div>
        )}
      </CldUploadWidget>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Full Name"
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
          label="Village"
          name="village"
          defaultValue={data?.village}
          register={register}
          error={errors.village}
        />
        <InputField
          label="Birthday"
          name="birthday"
          type="date"
          defaultValue={data?.birthday?.toISOString().split("T")[0]}
          register={register}
          error={errors.birthday}
        />
        <InputField
          label="Nationality"
          name="nationality"
          defaultValue={data?.nationality}
          register={register}
          error={errors.nationality}
        />
        
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("Sex")}
            defaultValue={data?.Sex}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.Sex?.message && (
            <p className="text-xs text-red-400">{errors.Sex.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Religion</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("Religion")}
            defaultValue={data?.Religion}
          >
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Christian">Christian</option>
            <option value="Sikh">Sikh</option>
            <option value="Usmani">Usmani</option>
            <option value="Raeen">Raeen</option>
            <option value="MominAnsar">Momin Ansar</option>
          </select>
          {errors.Religion?.message && (
            <p className="text-xs text-red-400">{errors.Religion.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Mother Tongue</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("tongue")}
            defaultValue={data?.tongue}
          >
            <option value="Hindi">Hindi</option>
            <option value="English">English</option>
            <option value="Punjabi">Punjabi</option>
            <option value="Urdu">Urdu</option>
            <option value="Bhojpuri">Bhojpuri</option>
            <option value="Gujarati">Gujarati</option>
          </select>
          {errors.tongue?.message && (
            <p className="text-xs text-red-400">{errors.tongue.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Category</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("category")}
            defaultValue={data?.category}
          >
            <option value="General">General</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="OBC">OBC</option>
            <option value="Other">Other</option>
          </select>
          {errors.category?.message && (
            <p className="text-xs text-red-400">{errors.category.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes?.map((classItem: any) => (
              <option value={classItem.id} key={classItem.id}>
                {classItem.name} ({classItem._count.students}/{classItem.capacity})
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">{errors.classId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Section</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sectionId")}
            defaultValue={data?.sectionId}
          >
            {sections?.map((section: any) => (
              <option value={section.id} key={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          {errors.sectionId?.message && (
            <p className="text-xs text-red-400">{errors.sectionId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Session</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sessionId")}
            defaultValue={data?.sessionId}
          >
            {sessions?.map((session: any) => (
              <option value={session.id} key={session.id}>
                {session.sessioncode}
              </option>
            ))}
          </select>
          {errors.sessionId?.message && (
            <p className="text-xs text-red-400">{errors.sessionId.message.toString()}</p>
          )}
        </div>

        <InputField
          label="Aadhar Card"
          name="aadharcard"
          defaultValue={data?.aadharcard}
          register={register}
          error={errors.aadharcard}
        />
        <InputField
          label="House"
          name="house"
          defaultValue={data?.house}
          register={register}
          error={errors.house}
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Blood Group</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("bloodgroup")}
            defaultValue={data?.bloodgroup}
          >
            <option value="A_plus">A+</option>
            <option value="A_minus">A-</option>
            <option value="B_plus">B+</option>
            <option value="B_minus">B-</option>
            <option value="O_plus">O+</option>
            <option value="O_minus">O-</option>
            <option value="AB_plus">AB+</option>
            <option value="AB_minus">AB-</option>
          </select>
          {errors.bloodgroup?.message && (
            <p className="text-xs text-red-400">{errors.bloodgroup.message.toString()}</p>
          )}
        </div>
      </div>
        <span className="text-xs text-gray-400 font-medium">
        Parents Information
      </span>
        <div className="flex justify-between flex-wrap gap-4">

        <InputField
          label="Mother's Name"
          name="mothername"
          defaultValue={data?.mothername}
          register={register}
          error={errors.mothername}
        />
        <InputField
          label="Mother's Phone"
          name="mphone"
          defaultValue={data?.mphone}
          register={register}
          error={errors.mphone}
        />
        <InputField
          label="Mother's Occupation"
          name="moccupation"
          defaultValue={data?.moccupation}
          register={register}
          error={errors.moccupation}
        />
        <InputField
          label="Father's Name"
          name="fathername"
          defaultValue={data?.fathername}
          register={register}
          error={errors.fathername}
        />
        <InputField
          label="Father's Phone"
          name="fphone"
          defaultValue={data?.fphone}
          register={register}
          error={errors.fphone}
        />
        <InputField
          label="Father's Occupation"
          name="foccupation"
          defaultValue={data?.foccupation}
          register={register}
          error={errors.foccupation}
        />

</div>
        <span className="text-xs text-gray-400 font-medium">
        Previous School Information
      </span>
        <div className="flex justify-between flex-wrap gap-4">
       

        <InputField
          label="Previous Class"
          name="previousClass"
          defaultValue={data?.previousClass}
          register={register}
          error={errors.previousClass}
        />
        <InputField
          label="Year of Pass"
          name="yearofpass"
          type="number"
          defaultValue={data?.yearofpass}
          register={register}
          error={errors.yearofpass}
        />
        <InputField
          label="Board"
          name="board"
          defaultValue={data?.board}
          register={register}
          error={errors.board}
        />
        <InputField
          label="School"
          name="school"
          defaultValue={data?.school}
          register={register}
          error={errors.school}
        />
        <InputField
          label="Grade"
          name="grade"
          defaultValue={data?.grade}
          register={register}
          error={errors.grade}
        />

        

        {data?.id && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>

      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default StudentForm;