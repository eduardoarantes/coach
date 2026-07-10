ALTER TABLE "PlannedWorkout"
ADD COLUMN "structureRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "generationRevision" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PlannedWorkout_id_generationRevision_idx"
ON "PlannedWorkout"("id", "generationRevision");

ALTER TABLE "SyncQueue"
ADD COLUMN "structureRevision" INTEGER;

CREATE INDEX "SyncQueue_entityType_entityId_structureRevision_idx"
ON "SyncQueue"("entityType", "entityId", "structureRevision");
