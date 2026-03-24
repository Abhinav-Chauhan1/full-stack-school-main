import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const sectionId = searchParams.get('sectionId');
  const sessionId = searchParams.get('sessionId');

  if (!classId || !sectionId || !sessionId) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  const students = await prisma.student.findMany({
    where: {
      classId: parseInt(classId),
      sectionId: parseInt(sectionId),
      isAlumni: false,
    },
    include: {
      Class: true,
      Section: true,
      Session: true,
      marksSenior: {
        include: {
          sectionSubject: { include: { subject: true } },
          coScholastic: true,
          session: { select: { sessioncode: true, sessionfrom: true, sessionto: true } },
        },
        where: { sessionId: parseInt(sessionId) },
        orderBy: { sectionSubject: { subject: { name: 'asc' } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const session = await prisma.session.findUnique({
    where: { id: parseInt(sessionId) },
  });

  const result = students.map((student) => ({
    student,
    marksSenior: student.marksSenior,
    session: session ?? student.Session,
  }));

  return NextResponse.json({ students: result });
}
