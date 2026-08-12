# Especificación: Sistema de Comisiones

## Propósito
Calcular comisiones sobre cada pago confirmado, permitir el cierre mensual del período y generar reportes consolidados.

## Modelo de datos

```prisma
model Commission {
  id        String   @id @default(cuid())
  paymentId String
  feeId     String
  amount    Float    // payment.amount * rate / 100
  rate      Float    // Snapshot de la tasa al calcular
  periodId  String?
  createdAt DateTime @default(now())
  payment   Payment  @relation(fields: [paymentId], references: [id])
  fee       Fee      @relation(fields: [feeId], references: [id])
  period    MonthlyClosing? @relation(fields: [periodId], references: [id])
  @@index([periodId])
  @@index([createdAt])
}

model MonthlyClosing {
  id               String   @id @default(cuid())
  month            Int
  year             Int
  status           String   @default("OPEN") // OPEN, CLOSED
  totalPayments    Float    @default(0)
  totalCommissions Float    @default(0)
  commissionRate   Float
  closedAt         DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  commissions      Commission[]
  @@unique([month, year])
  @@index([status])
}

model SiteConfig {
  id    String @id @default(cuid())
  key   String @unique
  value String
  updatedAt DateTime @updatedAt
}
```

## Requisitos

### Requisito: Tasa configurable global
El sistema DEBE almacenar una única tasa de comisión global configurable en `SiteConfig`.

#### Escenario: Cambio de tasa
- DADA una tasa de comisión del `5%`
- CUANDO el administrador actualiza la tasa al `6%`
- ENTONCES el sistema DEBE aplicar la nueva tasa solo a los pagos confirmados con posterioridad.

### Requisito: Cálculo al confirmar pago
El sistema DEBE calcular y persistir la comisión inmediatamente después de confirmar un pago.

#### Escenario: Cálculo exitoso
- DADO un pago de `5000` confirmado con tasa del `5%`
- CUANDO el sistema procesa la confirmación
- ENTONCES el sistema DEBE crear un registro `Commission` con monto `250` y tasa `5%`.

#### Escenario: Snapshot de tasa
- DADA una tasa del `5%` al momento de confirmar el pago
- CUANDO el administrador cambia la tasa posteriormente
- ENTONCES la comisión ya calculada DEBE conservar el `5%` original.

### Requisito: Cierre mensual
El sistema DEBE permitir cerrar un mes, agrupando todas las comisiones del período y generando totales.

#### Escenario: Cierre exitoso
- DADAS 20 comisiones generadas en septiembre de 2026
- CUANDO el administrador cierra el período `09/2026`
- ENTONCES el sistema DEBE crear un `MonthlyClosing` con `status=CLOSED`, totalizar pagos y comisiones, y asociar las comisiones al cierre.

#### Escenario: Cierre de período ya cerrado
- DADO un `MonthlyClosing` con `status=CLOSED`
- CUANDO el administrador intenta cerrar nuevamente el mismo período
- ENTONCES el sistema DEBE rechazar la operación con un error 409.

### Requisito: Reporte de comisiones
El sistema DEBE generar un reporte de comisiones por período, método de pago y socio.

#### Escenario: Reporte por período
- DADO un cierre mensual cerrado
- CUANDO el administrador solicita el reporte
- ENTONCES el sistema DEBE mostrar totales y el detalle de cada comisión con método de pago y monto.

## Reglas de negocio
- La tasa de comisión es única y global.
- Cada comisión se congela con la tasa vigente al confirmar el pago.
- Un período cerrado no puede modificarse.
- Las comisiones se calculan sobre pagos confirmados, no sobre cuotas.

## Casos límite
- Pago reembolsado: la comisión correspondiente DEBE anularse o marcarse como inválida.
- Cierre sin comisiones: el sistema DEBE permitir cerrar un período con totales en cero.
- Pago confirmado después del cierre: la comisión queda fuera del cierre anterior y puede incluirse en el siguiente.
