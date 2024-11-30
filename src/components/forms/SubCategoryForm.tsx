"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { subCategorySchema, SubCategorySchema } from "@/lib/formValidationSchemas";
import { createSubCategory, updateSubCategory } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Category } from "@prisma/client";

const SubCategoryForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubCategorySchema>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: {
      id: data?.id,
      name: data?.name,
      category: data?.category,
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createSubCategory : updateSubCategory,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const router = useRouter();

  
  const onSubmit = handleSubmit((formData) => {
      if (type === "update") {
          formData.id = data.id; // Ensure ID is included for updates
        }
        formAction(formData);
    });
    
    useEffect(() => {
      if (state.success) {
        toast.success(
          state.message ||
            `Subcategory has been ${type === "create" ? "created" : "updated"}!`
        );
        setOpen(false);
        router.refresh();
      } else if (state.error) {
        toast.error(state.message || "Something went wrong!");
      }
    }, [state, router, type, setOpen]);

    
  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new Subcategory" : "Update the Subcategory"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Category</label>
          <select
            defaultValue={data?.category}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("category")}
          >
            {Object.values(Category).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-red-400">{errors.category.message}</p>
          )}
        </div>

        <InputField
          label="Name"
          name="name"
          register={register}
          error={errors.name}
          className="w-full md:w-[48%]"
        />

        {type === "update" && (
          <input type="hidden" {...register("id")} />
        )}
      </div>

      {state.error && (
        <div className="text-red-500 bg-red-50 p-3 rounded-md">
          {state.message || "Something went wrong!"}
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default SubCategoryForm;