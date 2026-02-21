"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createFeeReceipt = async (data: any) => {
  try {
    console.log("Creating fee receipt with data:", data);

    // Validate required fields
    if (!data.studentId) {
      return {
        success: false,
        error: true,
        message: "Student is required",
      };
    }

    if (!data.sessionId) {
      return {
        success: false,
        error: true,
        message: "Session is required",
      };
    }

    // Generate receipt number
    const lastReceipt = await prisma.feeReceipt.findFirst({
      orderBy: { createdAt: "desc" },
      select: { receiptNo: true },
    });

    let receiptNo = "FR-0001";
    if (lastReceipt) {
      const lastNumber = parseInt(lastReceipt.receiptNo.split("-")[1]);
      receiptNo = `FR-${String(lastNumber + 1).padStart(4, "0")}`;
    }

    console.log("Generated receipt number:", receiptNo);

    const receiptData = {
      receiptNo,
      studentId: data.studentId,
      sessionId: typeof data.sessionId === 'number' ? data.sessionId : parseInt(data.sessionId),
      month: data.month || null,
      tuitionFee: typeof data.tuitionFee === 'number' ? data.tuitionFee : (parseFloat(data.tuitionFee) || 0),
      idCard: typeof data.idCard === 'number' ? data.idCard : (parseFloat(data.idCard) || 0),
      annualFee: typeof data.annualFee === 'number' ? data.annualFee : (parseFloat(data.annualFee) || 0),
      diaryCalendar: typeof data.diaryCalendar === 'number' ? data.diaryCalendar : (parseFloat(data.diaryCalendar) || 0),
      smartClasses: typeof data.smartClasses === 'number' ? data.smartClasses : (parseFloat(data.smartClasses) || 0),
      examFee: typeof data.examFee === 'number' ? data.examFee : (parseFloat(data.examFee) || 0),
      transportFee: typeof data.transportFee === 'number' ? data.transportFee : (parseFloat(data.transportFee) || 0),
      otherFees: typeof data.otherFees === 'number' ? data.otherFees : (parseFloat(data.otherFees) || 0),
      otherFeesDesc: data.otherFeesDesc || null,
      totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount),
      amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : parseFloat(data.amountPaid),
      discount: typeof data.discount === 'number' ? data.discount : (parseFloat(data.discount) || 0),
      previousDues: typeof data.previousDues === 'number' ? data.previousDues : (parseFloat(data.previousDues) || 0),
      paymentMode: data.paymentMode,
      transactionId: data.transactionId || null,
      remarks: data.remarks || null,
    };

    console.log("Creating receipt with data:", receiptData);

    const receipt = await prisma.feeReceipt.create({
      data: receiptData,
    });

    console.log("Receipt created successfully:", receipt.id);

    revalidatePath("/list/feeReceipts");
    return { success: true, data: receipt };
  } catch (error) {
    console.error("Create Fee Receipt Error:", error);
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to create receipt",
    };
  }
};

export const updateFeeReceipt = async (id: number, data: any) => {
  try {
    const receipt = await prisma.feeReceipt.update({
      where: { id },
      data: {
        month: data.month || null,
        tuitionFee: parseFloat(data.tuitionFee) || 0,
        idCard: parseFloat(data.idCard) || 0,
        annualFee: parseFloat(data.annualFee) || 0,
        diaryCalendar: parseFloat(data.diaryCalendar) || 0,
        smartClasses: parseFloat(data.smartClasses) || 0,
        examFee: parseFloat(data.examFee) || 0,
        transportFee: parseFloat(data.transportFee) || 0,
        otherFees: parseFloat(data.otherFees) || 0,
        otherFeesDesc: data.otherFeesDesc || null,
        totalAmount: parseFloat(data.totalAmount),
        amountPaid: parseFloat(data.amountPaid),
        discount: parseFloat(data.discount) || 0,
        previousDues: parseFloat(data.previousDues) || 0,
        paymentMode: data.paymentMode,
        transactionId: data.transactionId || null,
        remarks: data.remarks || null,
      },
    });

    revalidatePath("/list/feeReceipts");
    return { success: true, data: receipt };
  } catch (error) {
    console.error("Update Fee Receipt Error:", error);
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to update receipt",
    };
  }
};

export const deleteFeeReceipt = async (currentState: any, data: FormData) => {
  const id = data.get("id");
  
  try {
    await prisma.feeReceipt.delete({
      where: { id: Number(id) },
    });

    revalidatePath("/list/feeReceipts");
    return { success: true, error: false };
  } catch (error) {
    console.error("Delete Fee Receipt Error:", error);
    return {
      success: false,
      error: true,
    };
  }
};
