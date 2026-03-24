"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteAllAlumni = async () => {
  try {
    const alumni = await prisma.student.findMany({
      where: { isAlumni: true },
      select: { id: true },
    });

    const ids = alumni.map((s) => s.id);
    if (ids.length === 0) return { success: true, count: 0 };

    await prisma.$transaction(async (tx) => {
      await tx.feeReceipt.deleteMany({ where: { studentId: { in: ids } } });
      await tx.juniorMark.deleteMany({ where: { studentId: { in: ids } } });
      await tx.seniorMark.deleteMany({ where: { studentId: { in: ids } } });
      await tx.higherMark.deleteMany({ where: { studentId: { in: ids } } });
      await tx.student.deleteMany({ where: { id: { in: ids } } });
    });

    revalidatePath("/list/alumni");
    return { success: true, count: ids.length };
  } catch (err) {
    console.error("Delete alumni error:", err);
    return { success: false, error: true, message: err instanceof Error ? err.message : "Unknown error" };
  }
};
