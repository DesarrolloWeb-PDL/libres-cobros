-- CreateTable
CREATE TABLE "MassMessageCampaign" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'all',
    "category" TEXT,
    "memberStatus" TEXT,
    "planId" TEXT,
    "search" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassMessageCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MassMessageCampaign_clubId_idx" ON "MassMessageCampaign"("clubId");

-- CreateIndex
CREATE INDEX "MassMessageCampaign_status_idx" ON "MassMessageCampaign"("status");

-- CreateIndex
CREATE INDEX "MassMessageCampaign_scheduledAt_idx" ON "MassMessageCampaign"("scheduledAt");

-- AddForeignKey
ALTER TABLE "MassMessageCampaign" ADD CONSTRAINT "MassMessageCampaign_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
