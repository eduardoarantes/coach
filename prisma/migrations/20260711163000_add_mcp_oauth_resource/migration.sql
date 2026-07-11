-- AlterTable
ALTER TABLE "OAuthApp" ADD COLUMN "isPublicClient" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OAuthApp" ADD COLUMN "registrationType" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "OAuthAuthCode" ADD COLUMN "resource" TEXT;

-- AlterTable
ALTER TABLE "OAuthToken" ADD COLUMN "resource" TEXT;
ALTER TABLE "OAuthToken" ADD COLUMN "refreshTokenRotatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "McpToolExecution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "tokenId" TEXT,
    "requestId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "argsHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "McpToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpIdempotencyKey" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpToolExecution_userId_createdAt_idx" ON "McpToolExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_appId_createdAt_idx" ON "McpToolExecution"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolExecution_requestId_idx" ON "McpToolExecution"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "McpIdempotencyKey_appId_tokenId_toolName_idempotencyKey_key" ON "McpIdempotencyKey"("appId", "tokenId", "toolName", "idempotencyKey");

-- CreateIndex
CREATE INDEX "McpIdempotencyKey_expiresAt_idx" ON "McpIdempotencyKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_appId_fkey" FOREIGN KEY ("appId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "OAuthToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpIdempotencyKey" ADD CONSTRAINT "McpIdempotencyKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpIdempotencyKey" ADD CONSTRAINT "McpIdempotencyKey_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "OAuthToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
