# Especificación: Gestión de Cuotas

## Propósito
Configurar los montos de cuota por categoría de socio, generar las cuotas mensuales de forma masiva y gestionar sus estados y fechas de vencimiento.

## Modelo de datos

```prisma
model FeeConfig {
  id          String  @id @default(cuid())
  category    String  @unique // ADULT, FAMILY, MINOR
  amount      Float
  description String?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  fees        Fee[]
  @@index([category])
}

model Fee {
  id          String   @id @default(cuid())
  memberId    String
  feeConfigId String
  month       Int      // 1-12
  year        Int
  amount      Float    // Snapshot del monto al generar
  dueDate     DateTime
  status      String   @default("PENDING") // PENDING, PAID, OVERDUE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  member      Member   @relation(fields: [memberId], references: [id])
  feeConfig   FeeConfig @relation(fields: [feeConfigId], references: [id])
  payments    Payment[]
  commissions Commission[]
  @@unique([memberId, month, year])
  @@index([status])
  @@index([dueDate])
  @@index([memberId])
}
```

## Requisitos

### Requisito: Configuración de montos por categoría
El sistema DEBE permitir configurar un monto de cuota activo por cada categoría de socio.

#### Escenario: Actualización de monto
- DADA una configuración `ADULT` con monto `5000`
- CUANDO el administrador actualiza el monto a `5500`
- ENTONCES el sistema DEBE guardar el nuevo monto y aplicarlo solo a las cuotas generadas con posterioridad.

### Requisito: Generación mensual de cuotas
El sistema DEBE generar automáticamente una cuota para cada socio activo al inicio de cada mes, usando el monto vigente de su categoría.

#### Escenario: Generación exitosa
- DADOS 200 socios activos distribuidos en 3 categorías
- CUANDO el administrador ejecuta la generación de cuotas para `mes=09, año=2026`
- ENTONCES el sistema DEBE crear 200 registros `Fee` con estado `PENDING`, monto correspondiente y fecha de vencimiento del día 10 del mes.

#### Escenario: Generación idempotente
- DADAS cuotas ya generadas para `mes=09, año=2026`
- CUANDO el administrador vuelve a ejecutar la generación para el mismo período
- ENTONCES el sistema DEBE omitir la creación de duplicados e informar que ya existen cuotas para ese período.

### Requisito: Transiciones de estado
El sistema DEBE gestionar los estados `PENDING`, `PAID` y `OVERDUE` con transiciones válidas.

#### Escenario: Pago total
- DADA una cuota en estado `PENDING`
- CUANDO se confirma un pago por el monto exacto de la cuota
- ENTONCES el sistema DEBE cambiar el estado a `PAID`.

#### Escenario: Vencimiento automático
- DADA una cuota `PENDING` con fecha de vencimiento `2026-09-10`
- CUANDO el cron de Vercel ejecuta el día `2026-09-11`
- ENTONCES el sistema DEBE cambiar el estado a `OVERDUE`.

### Requisito: Socios inactivos
El sistema DEBE seguir generando cuotas a socios en estado `INACTIVE` para mantener el historial de deuda.

#### Escenario: Cuota de socio inactivo
- DADO un socio con estado `INACTIVE`
- CUANDO se generan las cuotas del mes
- ENTONCES el sistema DEBE crear su cuota con estado `PENDING` como a cualquier otro socio.

## Reglas de negocio
- Cada socio solo puede tener una cuota por mes-año.
- El monto de la cuota se congela al generarla (snapshot desde `FeeConfig`).
- No se permiten pagos parciales en el MVP.
- La fecha de vencimiento por defecto es el día 10 del mes de la cuota.
- El cron de vencimiento solo marca como `OVERDUE` las cuotas `PENDING` cuya fecha de vencimiento haya pasado.

## Casos límite
- `FeeConfig` inactiva: no se generan cuotas para nuevos socios de esa categoría, pero las existentes se mantienen.
- Cambio de categoría después de la generación: no afecta las cuotas ya generadas.
- Año bisiesto: la fecha de vencimiento del 29 de febrero DEBE manejarse correctamente.
