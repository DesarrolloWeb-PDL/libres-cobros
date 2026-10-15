-- CreateTable
CREATE TABLE "AutoDebit" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gatewaySubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_AUTH',
    "amount" DOUBLE PRECISION NOT NULL,
    "payerEmail" TEXT,
    "nextBillingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoDebit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoDebit_clubId_memberId_key" ON "AutoDebit"("clubId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoDebit_gateway_gatewaySubscriptionId_key" ON "AutoDebit"("gateway", "gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX "AutoDebit_clubId_idx" ON "AutoDebit"("clubId");

-- CreateIndex
CREATE INDEX "AutoDebit_status_idx" ON "AutoDebit"("status");

-- AddForeignKey
ALTER TABLE "AutoDebit" ADD CONSTRAINT "AutoDebit_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoDebit" ADD CONSTRAINT "AutoDebit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
