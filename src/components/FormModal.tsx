"use client";

import {
  deleteClass,
  deleteStudent,
  deleteTeacher,
  deleteSession,
  deleteSection,
  deleteSubCategory,
} from "@/lib/actions";
import { deleteSubject } from "@/app/(dashboard)/list/subjects/actions";
import { deleteJuniorMark } from "@/app/(dashboard)/list/juniorMark/actions";
import { deleteSeniorMark } from "@/app/(dashboard)/list/seniorMark/actions";
import { deleteJuniorCoScholastic } from "@/app/(dashboard)/list/juniorCoScholastic/actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";


const deleteActionMap: { [key: string]: (currentState: any, data: any) => Promise<{ success: boolean; error: boolean }> } = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  juniorMark: deleteJuniorMark,
  session: deleteSession,
  section: deleteSection,
  subCategory: deleteSubCategory,
  seniorMark: deleteSeniorMark,
  juniorCoScholastic: deleteJuniorCoScholastic,
};

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SessionForm = dynamic(() => import("./forms/SessionForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SectionForm = dynamic(() => import("./forms/SectionForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("../app/(dashboard)/list/subjects/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const JuniorMarkForm = dynamic(() => import("../app/(dashboard)/list/juniorMark/JuniorMarkForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubCategoryForm = dynamic(() => import("./forms/SubCategoryForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SeniorMarkForm = dynamic(() => import("../app/(dashboard)/list/seniorMark/SeniorMarkForm"), {
  loading: () => <h1>Loading...</h1>,
});
const HigherMarkForm = dynamic(() => import("../app/(dashboard)/list/higherMark/HigherMarkForm"), {
  loading: () => <h1>Loading...</h1>,
});
const JuniorCoScholasticForm = dynamic(() => import("../app/(dashboard)/list/juniorCoScholastic/JuniorCoScholasticForm"), {
  loading: () => <h1>Loading...</h1>,
});
// TODO: OTHER FORMS

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  section: (setOpen, type, data, relatedData) => (
    <SectionForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  juniorMark: (setOpen, type, data, relatedData) => (
    <JuniorMarkForm
      type={type}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  session: (setOpen, type, data, relatedData) => (
    <SessionForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  subCategory: (setOpen, type, data, relatedData) => (
    <SubCategoryForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  seniorMark: (setOpen, type, data, relatedData) => (
    <SeniorMarkForm
      type={type}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  higherMark: (setOpen, type, data, relatedData) => (
    <HigherMarkForm
      type={type}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  juniorCoScholastic: (setOpen, type, data, relatedData) => (
    <JuniorCoScholasticForm
      type={type}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  // TODO OTHER LIST ITEMS
};

const PdfGenerator = dynamic(() => import("./PdfGenerator"), {
  ssr: false
});

const PdfGenerator9 = dynamic(() => import("./PdfGenerator9"), {
  ssr: false
});

const PdfGenerator11 = dynamic(() => import("./PdfGenerator11"), {
  ssr: false
});

const BulkPdfGenerator = dynamic(() => import("./BulkPdfGenerator"), {
  ssr: false
});

const BulkPdfGenerator9 = dynamic(() => import("./BulkPdfGenerator9"), {
  ssr: false
});

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
        ? "bg-lamaSky"
        : type === "print"
          ? "bg-lamaGreen"  // New color for print button
          : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    const [state, formAction] = useFormState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`${table} has been deleted!`);
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    const FormComponent = forms[table];

    // Handle print type
    if (type === "print" && relatedData?.studentResult) {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <PdfGenerator 
            studentResult={relatedData.studentResult} 
            onClose={() => setOpen(false)} 
          />
        </div>
      );
    }

    // Existing form handling
    return type === "delete" && id ? (
      <form action={formAction} className="p-4 flex flex-col gap-4">
        <input type="text | number" name="id" value={id} hidden />
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      FormComponent ? (
        FormComponent(setOpen, type, data, relatedData)
      ) : (
        <p>Form for {table} not found!</p>
      )
    ) : (
      "Form not found!"
    );
  };

  const renderContent = () => {
    switch (table) {
      case "result":
        return (
          <>
            {relatedData.studentResult ? (
              <PdfGenerator
                studentResult={relatedData.studentResult}
                onClose={() => setOpen(false)}
              />
            ) : relatedData.studentsResults ? (
              <BulkPdfGenerator
                studentsResults={relatedData.studentsResults}
                onClose={() => setOpen(false)}
              />
            ) : null}
          </>
        );

      case "result9":
        return (
          <>
            {relatedData.studentResult ? (
              <PdfGenerator9
                studentResult={relatedData.studentResult}
                onClose={() => setOpen(false)}
              />
            ) : relatedData.studentsResults ? (
              <BulkPdfGenerator9
                studentsResults={relatedData.studentsResults}
                onClose={() => setOpen(false)}
              />
            ) : null}
          </>
        );

      case "result11":
        return (
          <PdfGenerator11
            studentResult={relatedData?.studentResult}
            onClose={() => setOpen(false)}
          />
        );

      default:
        return <Form />;
    }
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image 
          src={type === "print" ? "/print.png" : `/${type}.png`} 
          alt="" 
          width={16} 
          height={16} 
        />
      </button>
      {open && (
        <div className={`w-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center ${table === "juniorMark" || table === "seniorMark" || table === "higherMark" || table === "student" ? "h-auto" : "h-screen"}`}>

          <div
            className={`bg-white p-4 rounded-md relative ${table === "juniorMark" || table === "student" || table === "seniorMark" || table === "higherMark"
                ? "w-full"
                : "w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]"
              }`}
          >
            {renderContent()}
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>          </div>        </div>
      )}
    </>
  );
};

export default FormModal;
