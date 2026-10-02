-- Add customizable background color to Club and SiteConfig

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "bgColor" TEXT NOT NULL DEFAULT '#f8fafc';

-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN "bgColor" TEXT NOT NULL DEFAULT '#f8fafc';
