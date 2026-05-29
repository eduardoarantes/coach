-- CreateTable
CREATE TABLE "WorkoutStreamV2" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "time" INTEGER[],
    "distance" DOUBLE PRECISION[],
    "velocity" DOUBLE PRECISION[],
    "heartrate" INTEGER[],
    "cadence" INTEGER[],
    "watts" INTEGER[],
    "altitude" DOUBLE PRECISION[],
    "lat" DOUBLE PRECISION[],
    "lng" DOUBLE PRECISION[],
    "grade" DOUBLE PRECISION[],
    "moving" BOOLEAN[],
    "temp" INTEGER[],
    "torque" INTEGER[],
    "leftRightBalance" INTEGER[],
    "hrv" DOUBLE PRECISION[],
    "respiration" DOUBLE PRECISION[],
    "targetPower" INTEGER[],
    "avgPacePerKm" DOUBLE PRECISION,
    "paceVariability" DOUBLE PRECISION,
    "lapSplits" JSONB,
    "paceZones" JSONB,
    "pacingStrategy" JSONB,
    "surges" JSONB,
    "hrZoneTimes" JSONB,
    "powerZoneTimes" JSONB,
    "extrasMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutStreamV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutStreamV2_workoutId_key" ON "WorkoutStreamV2"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutStreamV2_workoutId_idx" ON "WorkoutStreamV2"("workoutId");

-- AddForeignKey
ALTER TABLE "WorkoutStreamV2" ADD CONSTRAINT "WorkoutStreamV2_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
