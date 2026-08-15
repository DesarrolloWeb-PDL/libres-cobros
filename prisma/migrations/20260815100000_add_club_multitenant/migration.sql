-- Migration A: add multi-tenant structure (step 1 of 3)
-- Creates Club + ProviderInvoice, AdminRole/ClubCommissionType enums, adds NULLABLE
-- clubId columns + plain composite indexes on the 8 tenant tables.
-- Global uniques are KEPT at this step: they must survive until the backfill
-- (scripts/backfill-multitenant.ts) assigns every existing row to the default club.
-- Step 2: run scripts/backfill-multitenant.ts. Step 3: migration B (club-constraints).

-- CreateEnum
CREATE TYPE "ClubCommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "commissionType" "ClubCommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInvoice" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "ProviderInvoice_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable clubId to the 8 tenant tables
ALTER TABLE "Member" ADD COLUMN "clubId" TEXT;
ALTER TABLE "FeeConfig" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Fee" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Commission" ADD COLUMN "clubId" TEXT;
ALTER TABLE "MonthlyClosing" ADD COLUMN "clubId" TEXT;
ALTER TABLE "WhatsAppLog" ADD COLUMN "clubId" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN "clubId" TEXT;

-- AlterTable: AdminUser.role -> AdminRole enum (values already ADMIN), plus nullable clubId
ALTER TABLE "AdminUser" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DATA TYPE "AdminRole" USING ("role"::"AdminRole");
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
ALTER TABLE "AdminUser" ADD COLUMN "clubId" TEXT;

-- CreateIndex: plain composite indexes on clubId (non-unique at this step)
CREATE INDEX "Member_clubId_idx" ON "Member"("clubId");
CREATE INDEX "FeeConfig_clubId_idx" ON "FeeConfig"("clubId");
CREATE INDEX "Fee_clubId_month_year_idx" ON "Fee"("clubId", "month", "year");
CREATE INDEX "Payment_clubId_idx" ON "Payment"("clubId");
CREATE INDEX "Commission_clubId_idx" ON "Commission"("clubId");
CREATE INDEX "MonthlyClosing_clubId_idx" ON "MonthlyClosing"("clubId");
CREATE INDEX "WhatsAppLog_clubId_idx" ON "WhatsAppLog"("clubId");
CREATE INDEX "SiteConfig_clubId_idx" ON "SiteConfig"("clubId");

-- CreateIndex: Club and ProviderInvoice
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
CREATE UNIQUE INDEX "ProviderInvoice_clubId_month_year_key" ON "ProviderInvoice"("clubId", "month", "year");
CREATE INDEX "ProviderInvoice_status_idx" ON "ProviderInvoice"("status");

-- AddForeignKey: tenant tables -> Club (clubId is nullable at this step)
ALTER TABLE "Member" ADD CONSTRAINT "Member_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeConfig" ADD CONSTRAINT "FeeConfig_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MonthlyClosing" ADD CONSTRAINT "MonthlyClosing_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
