/*
  Warnings:

  - A unique constraint covering the columns `[assignedSectionId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "assignedSectionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_assignedSectionId_key" ON "Teacher"("assignedSectionId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_assignedSectionId_fkey" FOREIGN KEY ("assignedSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
