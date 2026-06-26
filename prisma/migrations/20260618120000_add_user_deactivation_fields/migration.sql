ALTER TABLE "User"
ADD COLUMN "deactivatedAt" TIMESTAMP(3),
ADD COLUMN "deactivationReason" TEXT;

CREATE INDEX "User_deactivatedAt_idx" ON "User"("deactivatedAt");
