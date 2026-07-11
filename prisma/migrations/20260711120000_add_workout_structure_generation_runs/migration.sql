CREATE TABLE "WorkoutStructureGenerationRun" (
    "id" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "generationRevision" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "triggerRunId" TEXT,
    "requestSnapshot" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutStructureGenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutStructureGenerationRun_idempotencyKey_key"
ON "WorkoutStructureGenerationRun"("idempotencyKey");

CREATE INDEX "WorkoutStructureGenerationRun_plannedWorkoutId_generationRe_idx"
ON "WorkoutStructureGenerationRun"("plannedWorkoutId", "generationRevision");

CREATE INDEX "WorkoutStructureGenerationRun_plannedWorkoutId_status_idx"
ON "WorkoutStructureGenerationRun"("plannedWorkoutId", "status");

CREATE INDEX "WorkoutStructureGenerationRun_userId_createdAt_idx"
ON "WorkoutStructureGenerationRun"("userId", "createdAt");

CREATE UNIQUE INDEX "WorkoutStructureGenerationRun_active_per_workout_idx"
ON "WorkoutStructureGenerationRun"("plannedWorkoutId")
WHERE "status" IN ('PENDING', 'RUNNING');

ALTER TABLE "WorkoutStructureGenerationRun"
ADD CONSTRAINT "WorkoutStructureGenerationRun_plannedWorkoutId_fkey"
FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutStructureGenerationRun"
ADD CONSTRAINT "WorkoutStructureGenerationRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
