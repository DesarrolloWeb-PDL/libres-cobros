-- AlterTable
ALTER TABLE "Club" ADD COLUMN "cuit" TEXT;
ALTER TABLE "Club" ADD COLUMN "ivaCondicion" TEXT NOT NULL DEFAULT 'CF';

-- CreateTable
CREATE TABLE "SaasPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minMembers" INTEGER NOT NULL,
    "maxMembers" INTEGER NOT NULL,
    "priceArs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaasPlan_name_key" ON "SaasPlan"("name");

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "saasPlanId" TEXT NOT NULL,
    "pendingSaasPlanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaasSubscription_institutionId_key" ON "SaasSubscription"("institutionId");

-- CreateIndex
CREATE INDEX "SaasSubscription_saasPlanId_idx" ON "SaasSubscription"("saasPlanId");

-- CreateIndex
CREATE INDEX "SaasSubscription_status_idx" ON "SaasSubscription"("status");

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_saasPlanId_fkey" FOREIGN KEY ("saasPlanId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_pendingSaasPlanId_fkey" FOREIGN KEY ("pendingSaasPlanId") REFERENCES "SaasPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SaasPlanChangeRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "requestedSaasPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasPlanChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaasPlanChangeRequest_institutionId_idx" ON "SaasPlanChangeRequest"("institutionId");

-- CreateIndex
CREATE INDEX "SaasPlanChangeRequest_status_idx" ON "SaasPlanChangeRequest"("status");

-- AddForeignKey
ALTER TABLE "SaasPlanChangeRequest" ADD CONSTRAINT "SaasPlanChangeRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasPlanChangeRequest" ADD CONSTRAINT "SaasPlanChangeRequest_requestedSaasPlanId_fkey" FOREIGN KEY ("requestedSaasPlanId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SaasInvoice" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "saasPlanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transferRef" TEXT,
    "gatewayPaymentId" TEXT,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaasInvoice_institutionId_month_year_key" ON "SaasInvoice"("institutionId", "month", "year");

-- CreateIndex
CREATE INDEX "SaasInvoice_status_idx" ON "SaasInvoice"("status");

-- CreateIndex
CREATE INDEX "SaasInvoice_dueDate_idx" ON "SaasInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "SaasInvoice_institutionId_idx" ON "SaasInvoice"("institutionId");

-- AddForeignKey
ALTER TABLE "SaasInvoice" ADD CONSTRAINT "SaasInvoice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasInvoice" ADD CONSTRAINT "SaasInvoice_saasPlanId_fkey" FOREIGN KEY ("saasPlanId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SaasAutoDebit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gatewaySubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_AUTH',
    "amount" DOUBLE PRECISION NOT NULL,
    "payerEmail" TEXT,
    "nextBillingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasAutoDebit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaasAutoDebit_institutionId_key" ON "SaasAutoDebit"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "SaasAutoDebit_gateway_gatewaySubscriptionId_key" ON "SaasAutoDebit"("gateway", "gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX "SaasAutoDebit_status_idx" ON "SaasAutoDebit"("status");

-- AddForeignKey
ALTER TABLE "SaasAutoDebit" ADD CONSTRAINT "SaasAutoDebit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SaasComprobante" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tipo" INTEGER NOT NULL DEFAULT 15,
    "ptoVta" INTEGER NOT NULL,
    "nro" INTEGER NOT NULL,
    "cae" TEXT NOT NULL DEFAULT '',
    "caeVto" TIMESTAMP(3),
    "total" DOUBLE PRECISION NOT NULL,
    "docTipo" INTEGER NOT NULL,
    "docNro" BIGINT NOT NULL,
    "condicionIvaReceptor" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "rawRequest" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasComprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaasComprobante_invoiceId_key" ON "SaasComprobante"("invoiceId");

-- CreateIndex
CREATE INDEX "SaasComprobante_institutionId_idx" ON "SaasComprobante"("institutionId");

-- CreateIndex
CREATE INDEX "SaasComprobante_estado_idx" ON "SaasComprobante"("estado");

-- AddForeignKey
ALTER TABLE "SaasComprobante" ADD CONSTRAINT "SaasComprobante_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasComprobante" ADD CONSTRAINT "SaasComprobante_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SaasInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
