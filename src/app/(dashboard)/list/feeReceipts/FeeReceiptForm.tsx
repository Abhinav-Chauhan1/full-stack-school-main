"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type FeeReceiptFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: (open: boolean) => void;
  relatedData?: {
    sessions: any[];
    classes: any[];
    students: any[];
  };
};

export default function FeeReceiptForm({
  type,
  data,
  setOpen,
  relatedData,
}: FeeReceiptFormProps) {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: data || {},
  });

  const [selectedClass, setSelectedClass] = useState<number | null>(
    data?.student?.classId || null
  );
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    data?.studentId || null
  );
  const [feeStructure, setFeeStructure] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const watchedFees = watch([
    "tuitionFee",
    "idCard",
    "annualFee",
    "diaryCalendar",
    "smartClasses",
    "examFee",
    "transportFee",
    "otherFees",
    "discount",
    "previousDues",
  ]);

  // Calculate total
  useEffect(() => {
    const total =
      (Number(watchedFees[0]) || 0) +
      (Number(watchedFees[1]) || 0) +
      (Number(watchedFees[2]) || 0) +
      (Number(watchedFees[3]) || 0) +
      (Number(watchedFees[4]) || 0) +
      (Number(watchedFees[5]) || 0) +
      (Number(watchedFees[6]) || 0) +
      (Number(watchedFees[7]) || 0) +
      (Number(watchedFees[9]) || 0) -
      (Number(watchedFees[8]) || 0);

    setValue("totalAmount", total);
    setValue("amountPaid", total);
  }, [watchedFees, setValue]);

  // Load fee structure when class and session are selected
  const loadFeeStructure = async (classId: number, sessionId: number) => {
    try {
      const response = await fetch(
        `/api/feeStructure?classId=${classId}&sessionId=${sessionId}`
      );
      if (response.ok) {
        const structure = await response.json();
        setFeeStructure(structure);
        if (structure) {
          setValue("tuitionFee", structure.tuitionFee);
          setValue("idCard", structure.idCard);
          setValue("annualFee", structure.annualFee);
          setValue("diaryCalendar", structure.diaryCalendar);
          setValue("smartClasses", structure.smartClasses);
          setValue("examFee", structure.examFee);
          setValue("transportFee", structure.transportFee);
        }
      }
    } catch (error) {
      console.error("Error loading fee structure:", error);
    }
  };

  const onSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const url =
        type === "create"
          ? "/api/feeReceipts"
          : `/api/feeReceipts/${data.id}`;
      const method = type === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          `Fee receipt ${type === "create" ? "created" : "updated"} successfully`
        );
        setOpen(false);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save fee receipt");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents =
    relatedData?.students.filter(
      (s: any) => !selectedClass || s.classId === selectedClass
    ) || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Generate Fee Receipt" : "Update Fee Receipt"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session */}
        <div>
          <label className="block text-sm font-medium mb-1">Session *</label>
          <select
            {...register("sessionId", { required: true })}
            className="w-full p-2 border rounded"
            onChange={(e) => {
              const sessionId = Number(e.target.value);
              if (selectedClass) {
                loadFeeStructure(selectedClass, sessionId);
              }
            }}
          >
            <option value="">Select Session</option>
            {relatedData?.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.sessioncode}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="block text-sm font-medium mb-1">Class *</label>
          <select
            value={selectedClass || ""}
            onChange={(e) => {
              const classId = Number(e.target.value);
              setSelectedClass(classId);
              setSelectedStudent(null);
              const sessionId = watch("sessionId");
              if (sessionId) {
                loadFeeStructure(classId, Number(sessionId));
              }
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Class</option>
            {relatedData?.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Student */}
        <div>
          <label className="block text-sm font-medium mb-1">Student *</label>
          <select
            {...register("studentId", { required: true })}
            className="w-full p-2 border rounded"
            disabled={!selectedClass}
          >
            <option value="">Select Student</option>
            {filteredStudents.map((student: any) => (
              <option key={student.id} value={student.id}>
                {student.name} (Adm: {student.admissionno})
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select {...register("month")} className="w-full p-2 border rounded">
            <option value="">Select Month</option>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fee Details */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Fee Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tuition Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...register("tuitionFee")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ID Card</label>
            <input
              type="number"
              step="0.01"
              {...register("idCard")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Annual Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...register("annualFee")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Diary & Calendar
            </label>
            <input
              type="number"
              step="0.01"
              {...register("diaryCalendar")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Smart Classes
            </label>
            <input
              type="number"
              step="0.01"
              {...register("smartClasses")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Exam Fee</label>
            <input
              type="number"
              step="0.01"
              {...register("examFee")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transport Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...register("transportFee")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Other Fees
            </label>
            <input
              type="number"
              step="0.01"
              {...register("otherFees")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Other Fees Description
            </label>
            <input
              type="text"
              {...register("otherFeesDesc")}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Payment Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Discount</label>
            <input
              type="number"
              step="0.01"
              {...register("discount")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Previous Dues
            </label>
            <input
              type="number"
              step="0.01"
              {...register("previousDues")}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Total Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...register("totalAmount")}
              className="w-full p-2 border rounded bg-gray-100"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount Paid *
            </label>
            <input
              type="number"
              step="0.01"
              {...register("amountPaid", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Mode *
            </label>
            <select
              {...register("paymentMode", { required: true })}
              className="w-full p-2 border rounded"
            >
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transaction ID
            </label>
            <input
              type="text"
              {...register("transactionId")}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <textarea
            {...register("remarks")}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading
            ? "Saving..."
            : type === "create"
            ? "Generate Receipt"
            : "Update Receipt"}
        </button>
      </div>
    </form>
  );
}
