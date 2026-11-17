-- AddColumn
-- Drift fix: schema.prisma declared MassMessageCampaign.channels (a5dfb2c)
-- but no migration ever created it, so Prisma Client selected a non-existent
-- column (P2022 / 42703) and every massMessageCampaign query failed.
ALTER TABLE "MassMessageCampaign" ADD COLUMN "channels" TEXT;
