-- RenameTable
ALTER TABLE "WhatsAppLog" RENAME TO "SmsLog";

-- RenameIndex (Prisma auto-creates indexes with model name prefix)
ALTER INDEX "WhatsAppLog_memberId_idx" RENAME TO "SmsLog_memberId_idx";
ALTER INDEX "WhatsAppLog_sentAt_idx" RENAME TO "SmsLog_sentAt_idx";
ALTER INDEX "WhatsAppLog_type_idx" RENAME TO "SmsLog_type_idx";
ALTER INDEX "WhatsAppLog_clubId_idx" RENAME TO "SmsLog_clubId_idx";

-- RenameForeignKey (Club relation)
ALTER TABLE "SmsLog" DROP CONSTRAINT "SmsLog_clubId_fkey";
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameForeignKey (Member relation)
ALTER TABLE "SmsLog" DROP CONSTRAINT "SmsLog_memberId_fkey";
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
