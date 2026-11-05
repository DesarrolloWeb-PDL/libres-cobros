-- Make SmsLog.memberId nullable so platform SaaS invoice reminders can log without a member.

-- AlterTable
ALTER TABLE "SmsLog" ALTER COLUMN "memberId" DROP NOT NULL;
