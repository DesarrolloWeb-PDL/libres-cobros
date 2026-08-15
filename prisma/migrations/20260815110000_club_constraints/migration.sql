-- Migration B: multi-tenant constraints (step 3 of 3)
-- Runs AFTER scripts/backfill-multitenant.ts has assigned every existing row to the
-- default club. Sets clubId NOT NULL, replaces global uniques with per-club composite
-- uniques. The AdminUser.role enum (AdminRole) is already in place from migration A;
-- values are finalized here (SUPER_ADMIN set by the backfill, default stays ADMIN).

-- AlterTable: clubId NOT NULL on the 8 tenant tables (backfill guarantees no nulls)
ALTER TABLE "Member" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "FeeConfig" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Fee" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Commission" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "MonthlyClosing" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "WhatsAppLog" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "SiteConfig" ALTER COLUMN "clubId" SET NOT NULL;

-- DropIndex: global uniques replaced by per-club composite uniques
DROP INDEX "Member_dni_key";
DROP INDEX "Member_email_key";
DROP INDEX "FeeConfig_category_key";
DROP INDEX "MonthlyClosing_month_year_key";
DROP INDEX "SiteConfig_key_key";

-- CreateIndex: per-club composite uniques (NULL emails stay distinct in PostgreSQL)
CREATE UNIQUE INDEX "Member_clubId_dni_key" ON "Member"("clubId", "dni");
CREATE UNIQUE INDEX "Member_clubId_email_key" ON "Member"("clubId", "email");
CREATE UNIQUE INDEX "FeeConfig_clubId_category_key" ON "FeeConfig"("clubId", "category");
CREATE UNIQUE INDEX "MonthlyClosing_clubId_month_year_key" ON "MonthlyClosing"("clubId", "month", "year");
CREATE UNIQUE INDEX "SiteConfig_clubId_key_key" ON "SiteConfig"("clubId", "key");
