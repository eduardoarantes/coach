-- CreateEnum
CREATE TYPE "WorkoutLibraryVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "WorkoutLibraryDefaultKind" AS ENUM ('AI_GENERATED');

-- CreateTable
CREATE TABLE "WorkoutLibrary" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "WorkoutLibraryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultKind" "WorkoutLibraryDefaultKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLibraryItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "category" TEXT,
    "durationSec" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "tss" DOUBLE PRECISION,
    "workIntensity" DOUBLE PRECISION,
    "targetArea" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "structuredWorkout" JSONB,
    "sourcePlannedWorkoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLibrary_userId_defaultKind_key"
ON "WorkoutLibrary"("userId", "defaultKind");

-- CreateIndex
CREATE INDEX "WorkoutLibrary_userId_idx"
ON "WorkoutLibrary"("userId");

-- CreateIndex
CREATE INDEX "WorkoutLibrary_visibility_createdAt_idx"
ON "WorkoutLibrary"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutLibraryItem_userId_idx"
ON "WorkoutLibraryItem"("userId");

-- CreateIndex
CREATE INDEX "WorkoutLibraryItem_libraryId_idx"
ON "WorkoutLibraryItem"("libraryId");

-- CreateIndex
CREATE INDEX "WorkoutLibraryItem_userId_type_idx"
ON "WorkoutLibraryItem"("userId", "type");

-- CreateIndex
CREATE INDEX "WorkoutLibraryItem_sourcePlannedWorkoutId_idx"
ON "WorkoutLibraryItem"("sourcePlannedWorkoutId");

-- AddForeignKey
ALTER TABLE "WorkoutLibrary"
ADD CONSTRAINT "WorkoutLibrary_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLibraryItem"
ADD CONSTRAINT "WorkoutLibraryItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLibraryItem"
ADD CONSTRAINT "WorkoutLibraryItem_libraryId_fkey"
FOREIGN KEY ("libraryId") REFERENCES "WorkoutLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLibraryItem"
ADD CONSTRAINT "WorkoutLibraryItem_sourcePlannedWorkoutId_fkey"
FOREIGN KEY ("sourcePlannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
