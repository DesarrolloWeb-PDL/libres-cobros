-- CreateTable
CREATE TABLE "MemberLoginCode" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberLoginCode_clubId_memberId_idx" ON "MemberLoginCode"("clubId", "memberId");

-- CreateIndex
CREATE INDEX "MemberLoginCode_expiresAt_idx" ON "MemberLoginCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "MemberLoginCode" ADD CONSTRAINT "MemberLoginCode_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberLoginCode" ADD CONSTRAINT "MemberLoginCode_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
