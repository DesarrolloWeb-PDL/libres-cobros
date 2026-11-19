-- Repair: align migration history with the actual database behavior.
-- The original multitenant migration recorded ON DELETE RESTRICT, but the
-- deployed database (and schema.prisma, via nullable clubId => SetNull) has
-- used ON DELETE SET NULL since the backfill. This migration makes the
-- history match reality; it changes nothing at runtime because the database
-- already runs with SET NULL.
ALTER TABLE "SiteConfig" DROP CONSTRAINT IF EXISTS "SiteConfig_clubId_fkey";
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
