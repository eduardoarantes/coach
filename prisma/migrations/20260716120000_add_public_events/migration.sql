-- CreateTable
CREATE TABLE "PublicEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizerName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startTime" TEXT,
    "type" TEXT,
    "subType" TEXT,
    "distance" DOUBLE PRECISION,
    "elevation" INTEGER,
    "expectedDuration" DOUBLE PRECISION,
    "terrain" TEXT,
    "city" TEXT,
    "country" TEXT,
    "location" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "registrationUrl" TEXT,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "publicEventId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicEvent_slug_key" ON "PublicEvent"("slug");

-- CreateIndex
CREATE INDEX "PublicEvent_isPublished_date_idx" ON "PublicEvent"("isPublished", "date");

-- CreateIndex
CREATE INDEX "PartnerCampaignEvent_campaignId_displayOrder_idx" ON "PartnerCampaignEvent"("campaignId", "displayOrder");

-- CreateIndex
CREATE INDEX "PartnerCampaignEvent_publicEventId_idx" ON "PartnerCampaignEvent"("publicEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCampaignEvent_campaignId_publicEventId_key" ON "PartnerCampaignEvent"("campaignId", "publicEventId");

-- AddForeignKey
ALTER TABLE "PartnerCampaignEvent" ADD CONSTRAINT "PartnerCampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PartnerCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCampaignEvent" ADD CONSTRAINT "PartnerCampaignEvent_publicEventId_fkey" FOREIGN KEY ("publicEventId") REFERENCES "PublicEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
