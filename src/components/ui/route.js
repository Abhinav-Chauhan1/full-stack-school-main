import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const { marks } = await request.json();

    // Start a transaction
    const result = await prisma.$transaction(
      marks.map(mark => {
        const data = {
          ut1: mark.ut1 ? parseFloat(mark.ut1) : null,
          ut2: mark.ut2 ? parseFloat(mark.ut2) : null,
          ut3: mark.ut3 ? parseFloat(mark.ut3) : null,
          ut4: mark.ut4 ? parseFloat(mark.ut4) : null,
          noteBook: mark.noteBook ? parseFloat(mark.noteBook) : null,
          subEnrichment: mark.subEnrichment ? parseFloat(mark.subEnrichment) : null,
          examMarks: mark.examMarks ? parseFloat(mark.examMarks) : null,
          totalMarks: mark.totalMarks ? parseFloat(mark.totalMarks) : null,
          grade: mark.grade,
          studentId: mark.studentId,
          classSubjectId: mark.classSubjectId,
          sessionId: mark.sessionId,
          examType: mark.examType
        };

        if (mark.id) {
          // Update existing record
          return prisma.juniorMark.update({
            where: { id: mark.id },
            data
          });
        } else {
          // Create new record
          return prisma.juniorMark.create({
            data
          });
        }
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving marks:', error);
    return NextResponse.json({ error: 'Failed to save marks' }, { status: 500 });
  }
}