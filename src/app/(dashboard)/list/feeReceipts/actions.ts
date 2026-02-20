"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createFeeReceipt = async (data: any) => {
  try {
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

    const receipt = await prisma.feeReceipt.create({
      data: {
        receiptNo,
        studentId: data.studentId,
        sessionId: parseInt(data.sessionId),
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

export const deleteFeeReceipt = async (id: number) => {
  try {
    await prisma.feeReceipt.delete({
      where: { id },
    });

    revalidatePath("/list/feeReceipts");
    return { success: true };
  } catch (error) {
    console.error("Delete Fee Receipt Error:", error);
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete receipt",
    };
  }
};
