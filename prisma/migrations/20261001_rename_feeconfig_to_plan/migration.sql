-- Rename FeeConfig -> Plan and category -> name
ALTER TABLE "FeeConfig" RENAME TO "Plan";
ALTER TABLE "Plan" RENAME COLUMN "category" TO "name";

ALTER TABLE "Fee" RENAME COLUMN "feeConfigId" TO "planId";

-- Add nullable planId to Member and backfill from legacy category
ALTER TABLE "Member" ADD COLUMN "planId" TEXT;
ALTER TABLE "Member" ADD CONSTRAINT "Member_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Member" m
SET "planId" = p.id
FROM "Plan" p
WHERE m."clubId" = p."clubId"
  AND m.category = p.name;

CREATE INDEX "Member_planId_idx" ON "Member"("planId");
