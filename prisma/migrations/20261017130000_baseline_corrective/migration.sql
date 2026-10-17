-- Baseline corrective migration: makes the migration chain self-convergent
-- with production. All ADD COLUMN / ADD CONSTRAINT statements are guarded
-- so this is a no-op on prod (objects already exist) and creates the
-- missing objects on a fresh replay.

-- Plan artifact renames (old names exist on BOTH prod and fresh replay)
ALTER TABLE "Plan" RENAME CONSTRAINT "FeeConfig_pkey" TO "Plan_pkey";
ALTER TABLE "Fee" RENAME CONSTRAINT "Fee_feeConfigId_fkey" TO "Fee_planId_fkey";
ALTER TABLE "Plan" RENAME CONSTRAINT "FeeConfig_clubId_fkey" TO "Plan_clubId_fkey";
ALTER INDEX "FeeConfig_category_idx" RENAME TO "Plan_name_idx";
ALTER INDEX "FeeConfig_clubId_category_key" RENAME TO "Plan_clubId_name_key";
ALTER INDEX "FeeConfig_clubId_idx" RENAME TO "Plan_clubId_idx";

-- Fresh-replay convergence (all guarded; no-ops on prod)
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "siglas" TEXT;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed';
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT NOT NULL DEFAULT '#a78bfa';
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#5b21b6';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT NOT NULL DEFAULT '#a78bfa';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#5b21b6';

-- Relax SiteConfig.clubId to nullable (matches schema.prisma and prod)
-- Guarded: only drops NOT NULL if it's currently set
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SiteConfig' AND column_name = 'clubId' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "SiteConfig" ALTER COLUMN "clubId" DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  -- Rename SmsLog PK if still named after WhatsAppLog (fresh replay artifact)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppLog_pkey') THEN
    ALTER TABLE "SmsLog" RENAME CONSTRAINT "WhatsAppLog_pkey" TO "SmsLog_pkey";
  END IF;
  -- Add ProviderInvoice club FK if missing (fresh replay)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderInvoice_clubId_fkey') THEN
    ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_clubId_fkey"
      FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Fix SiteConfig club FK to SET NULL (matches schema.prisma optional relation)
-- Guarded: only recreate if current behavior is RESTRICT
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SiteConfig_clubId_fkey' AND confdeltype = 'a'
  ) THEN
    ALTER TABLE "SiteConfig" DROP CONSTRAINT "SiteConfig_clubId_fkey";
    ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_clubId_fkey"
      FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
