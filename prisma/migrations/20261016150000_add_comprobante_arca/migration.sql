-- ARCA Phase 1: electronic receipts (Recibo C, tipo 15).
-- Generated with `prisma migrate diff` (schema-only). NOT applied to the database:
-- DATABASE_URL points to a hosted (Neon) instance, so applying was left as an
-- explicit operator step (`npx prisma migrate deploy`).

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "cuit" TEXT,
ADD COLUMN     "ivaCondicion" TEXT NOT NULL DEFAULT 'CF';

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tipo" INTEGER NOT NULL DEFAULT 15,
    "ptoVta" INTEGER NOT NULL,
    "nro" INTEGER NOT NULL,
    "cae" TEXT NOT NULL DEFAULT '',
    "caeVto" TIMESTAMP(3),
    "total" DOUBLE PRECISION NOT NULL,
    "docTipo" INTEGER NOT NULL,
    "docNro" INTEGER NOT NULL,
    "condicionIvaReceptor" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "rawRequest" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprobante_paymentId_key" ON "Comprobante"("paymentId");

-- CreateIndex
CREATE INDEX "Comprobante_clubId_idx" ON "Comprobante"("clubId");

-- CreateIndex
CREATE INDEX "Comprobante_estado_idx" ON "Comprobante"("estado");

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
