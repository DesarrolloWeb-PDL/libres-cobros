-- Rename WhatsAppLog to SmsLog (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WhatsAppLog') THEN
    ALTER TABLE "WhatsAppLog" RENAME TO "SmsLog";
  END IF;
END $$;

-- Rename indexes (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WhatsAppLog_memberId_idx') THEN
    ALTER INDEX "WhatsAppLog_memberId_idx" RENAME TO "SmsLog_memberId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WhatsAppLog_sentAt_idx') THEN
    ALTER INDEX "WhatsAppLog_sentAt_idx" RENAME TO "SmsLog_sentAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WhatsAppLog_type_idx') THEN
    ALTER INDEX "WhatsAppLog_type_idx" RENAME TO "SmsLog_type_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WhatsAppLog_clubId_idx') THEN
    ALTER INDEX "WhatsAppLog_clubId_idx" RENAME TO "SmsLog_clubId_idx";
  END IF;
END $$;

-- Rename foreign keys (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppLog_clubId_fkey') THEN
    ALTER TABLE "SmsLog" DROP CONSTRAINT "WhatsAppLog_clubId_fkey";
    ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppLog_memberId_fkey') THEN
    ALTER TABLE "SmsLog" DROP CONSTRAINT "WhatsAppLog_memberId_fkey";
    ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
