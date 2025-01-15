import prisma from "@/lib/prisma";
import PromoteStudentForm from "./PromoteStudentForm";

export default async function PromoteStudentPage() {

  const [classes, sections, sessions] = await Promise.all([
    prisma.class.findMany({
      orderBy: { classNumber: 'asc' }
    }),
    prisma.section.findMany({
      include: { class: true }
    }),
    prisma.session.findMany({
      orderBy: { sessionfrom: 'desc' }
    })
  ]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Promote Students</h1>
      <div className="bg-white rounded-lg p-6 shadow-md">
        <PromoteStudentForm 
          classes={classes}
          sections={sections}
          sessions={sessions}
        />
      </div>
    </div>
  );
}
