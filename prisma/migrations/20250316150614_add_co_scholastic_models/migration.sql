-- CreateTable
CREATE TABLE "JuniorCoScholastic" (
    "id" TEXT NOT NULL,
    "juniorMarkId" TEXT NOT NULL,
    "term1ValueEducation" TEXT,
    "term1PhysicalEducation" TEXT,
    "term1ArtCraft" TEXT,
    "term1Discipline" TEXT,
    "term2ValueEducation" TEXT,
    "term2PhysicalEducation" TEXT,
    "term2ArtCraft" TEXT,
    "term2Discipline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuniorCoScholastic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeniorCoScholastic" (
    "id" SERIAL NOT NULL,
    "seniorMarkId" INTEGER NOT NULL,
    "term1ValueEducation" TEXT,
    "term1PhysicalEducation" TEXT,
    "term1ArtCraft" TEXT,
    "term1Discipline" TEXT,
    "term2ValueEducation" TEXT,
    "term2PhysicalEducation" TEXT,
    "term2ArtCraft" TEXT,
    "term2Discipline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeniorCoScholastic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HigherCoScholastic" (
    "id" SERIAL NOT NULL,
    "higherMarkId" INTEGER NOT NULL,
    "physicalEducation" TEXT,
    "workExperience" TEXT,
    "discipline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HigherCoScholastic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JuniorCoScholastic_juniorMarkId_key" ON "JuniorCoScholastic"("juniorMarkId");

-- CreateIndex
CREATE UNIQUE INDEX "SeniorCoScholastic_seniorMarkId_key" ON "SeniorCoScholastic"("seniorMarkId");

-- CreateIndex
CREATE UNIQUE INDEX "HigherCoScholastic_higherMarkId_key" ON "HigherCoScholastic"("higherMarkId");

-- AddForeignKey
ALTER TABLE "JuniorCoScholastic" ADD CONSTRAINT "JuniorCoScholastic_juniorMarkId_fkey" FOREIGN KEY ("juniorMarkId") REFERENCES "JuniorMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorCoScholastic" ADD CONSTRAINT "SeniorCoScholastic_seniorMarkId_fkey" FOREIGN KEY ("seniorMarkId") REFERENCES "SeniorMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HigherCoScholastic" ADD CONSTRAINT "HigherCoScholastic_higherMarkId_fkey" FOREIGN KEY ("higherMarkId") REFERENCES "HigherMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;
