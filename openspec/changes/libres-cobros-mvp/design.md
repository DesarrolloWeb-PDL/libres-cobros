# Diseño técnico: MVP libres-cobros

## Enfoque técnico

Arquitectura **Fee-First** sobre Next.js 14 (App Router), Prisma y PostgreSQL. Se pre-generan las cuotas mensuales (`Fee`) vinculadas a cada socio; los pagos (`Payment`) se imputan a una cuota específica y, al confirmarse, actualizan el estado de la cuota y generan una comisión. Se reutilizan los patrones probados de Tiempo Bakery para checkout, webhooks de Stripe/MercadoPago y manejo de credenciales en `SiteConfig`.

## Decisiones de arquitectura

| Decisión | Opción elegida | Alternativas descartadas | Racional |
|----------|----------------|--------------------------|----------|
| Modelo de autenticación | Solo administradores con NextAuth.js + credenciales; portal de socios sin contraseña (acceso por DNI) | NextAuth con OAuth para socios | El MVP no requiere credenciales de socio; reduce fricción en el pago. |
| Esquema de pagos | `Payment` vinculado a una `Fee` (1:1 en el MVP) | Pago genérico sin fee asociada | Permite conciliación exacta, comisiones por pago y estados sincronizados. |
| Configuración dinámica | `SiteConfig` (clave-valor en PostgreSQL) | Variables de entorno únicamente | Los administradores pueden cambiar tasas, alias y CBU sin redeploy. |
| Envío de WhatsApp | Meta Cloud API directa con plantillas | Twilio / proveedor local | Argentina: MercadoPago + WhatsApp Business es el ecosistema natural del club. |
| Cálculo de comisiones | Al confirmar pago, con snapshot de tasa | Cálculo periódico en batch | Auditoría simple y cierre mensual determinista. |
| Exportación de reportes | `xlsx` generado server-side con streaming | CSV primario, PDF | Excel es el formato obligatorio del MVP; evita dependencias pesadas. |

## Flujo de datos

```
Admin ──► API /admin ──► Prisma ──► PostgreSQL
Portal ──► API /checkout ──► Stripe/MP/Transfer
Stripe/MP ──► API /webhooks ──► Payment/Fee ──► Commission
Cron Vercel ──► API /cron/overdue ──► Fee.status = OVERDUE
Admin/Portal ──► API /whatsapp ──► Meta Cloud API ──► WhatsAppLog
```

1. El administrador configura `FeeConfig`, `SiteConfig` (tasa, datos bancarios) y carga socios.
2. El cron o un botón generan `Fee` mensuales con monto congelado.
3. El socio ingresa su DNI en `/pagos`, selecciona una cuota y método.
4. Se crea un `Payment` en `PENDING` y se redirige al proveedor (Stripe/MP) o se muestran datos de transferencia.
5. El webhook o la confirmación manual marcan `Payment` y `Fee` como `PAID` y crean `Commission`.
6. El administrador cierra el mes generando `MonthlyClosing` con totales.

## Cambios en archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | Crear | Modelos de dominio completos: `Member`, `FeeConfig`, `Fee`, `Payment`, `Commission`, `MonthlyClosing`, `WhatsAppLog`, `SiteConfig`, `AdminUser`. |
| `src/lib/db.ts` | Crear | Singleton de `PrismaClient` con manejo de entorno. |
| `src/lib/payments.ts` | Crear | Abstracción de proveedores, lectura de credenciales desde `SiteConfig` y env. |
| `src/lib/stripe.ts` | Crear | Creación de sesiones de checkout y verificación de webhooks. |
| `src/lib/mercadopago.ts` | Crear | Wrapper del SDK de MercadoPago: preferencias y consulta de pagos. |
| `src/lib/whatsapp.ts` | Crear | Cliente de Meta Cloud API, envío individual y envío masivo con throttling. |
| `src/lib/commissions.ts` | Crear | Cálculo de comisión y cierre mensual. |
| `src/lib/reports.ts` | Crear | Generación de reportes y exportación a Excel. |
| `src/lib/auth.ts` | Crear | Configuración de NextAuth.js para administradores. |
| `src/app/api/admin/**/route.ts` | Crear | Endpoints de ABM de socios, cuotas, pagos, reportes y cierre mensual. |
| `src/app/api/checkout/route.ts` | Crear | Creación de pago y redirección al proveedor. |
| `src/app/api/webhooks/stripe/route.ts` | Crear | Recepción y validación de eventos de Stripe. |
| `src/app/api/webhooks/mercadopago/route.ts` | Crear | Recepción y validación de notificaciones IPN de MercadoPago. |
| `src/app/api/cron/overdue/route.ts` | Crear | Marca cuotas vencidas mediante Vercel Cron. |
| `src/app/api/cron/fees/route.ts` | Crear | Generación mensual de cuotas (opcionalmente disparado por cron). |
| `src/app/admin/**/page.tsx` | Crear | Páginas del dashboard administrativo. |
| `src/app/pagos/**/page.tsx` | Crear | Portal de socios por DNI. |
| `src/components/admin/*.tsx` | Crear | Componentes de UI del panel admin. |
| `src/components/member/*.tsx` | Crear | Componentes del portal de socios. |
| `src/types/*.ts` | Crear | Esquemas Zod y tipos TypeScript compartidos. |

## Modelo de base de datos

### Prisma schema

```prisma
model Member {
  id        String   @id @default(cuid())
  dni       String   @unique
  firstName String
  lastName  String
  email     String?  @unique
  phone     String?
  category  String   @default("ADULT")
  status    String   @default("ACTIVE")
  joinDate  DateTime @default(now())
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  fees      Fee[]
  payments  Payment[]
  whatsappLogs WhatsAppLog[]

  @@index([dni])
  @@index([status])
  @@index([category])
}

model FeeConfig {
  id          String  @id @default(cuid())
  category    String  @unique
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
  month       Int
  year        Int
  amount      Float
  dueDate     DateTime
  status      String   @default("PENDING")
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

model Payment {
  id                      String   @id @default(cuid())
  feeId                   String
  memberId                String
  amount                  Float
  method                  String
  status                  String   @default("PENDING")
  stripeSessionId         String?
  stripePaymentId         String?
  mercadopagoPaymentId    String?
  mercadopagoPreferenceId String?
  bankTransferRef         String?
  confirmedAt             DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  fee                     Fee      @relation(fields: [feeId], references: [id])
  member                  Member   @relation(fields: [memberId], references: [id])
  commissions             Commission[]

  @@index([feeId])
  @@index([memberId])
  @@index([status])
  @@index([stripePaymentId])
  @@index([mercadopagoPaymentId])
}

model Commission {
  id        String   @id @default(cuid())
  paymentId String
  feeId     String
  amount    Float
  rate      Float
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
  status           String   @default("OPEN")
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

model WhatsAppLog {
  id         String   @id @default(cuid())
  memberId   String
  type       String
  message    String
  status     String
  externalId String?
  error      String?
  sentAt     DateTime @default(now())
  member     Member   @relation(fields: [memberId], references: [id])

  @@index([memberId])
  @@index([sentAt])
  @@index([type])
}

model SiteConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model AdminUser {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  passwordHash String
  role      String   @default("ADMIN")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Índices y restricciones

- `Member.dni` y `Member.email` son únicos.
- `Fee.[memberId, month, year]` es único para evitar duplicados mensuales.
- `MonthlyClosing.[month, year]` es único.
- Índices en estados (`Fee.status`, `Payment.status`) y fechas (`Fee.dueDate`, `WhatsAppLog.sentAt`) para reportes y cron jobs.

### Estrategia de migraciones

1. `prisma migrate dev --name init` para crear la base desde cero.
2. Datos semilla mediante `prisma/seed.ts`: un administrador inicial, categorías `ADULT`, `FAMILY`, `MINOR` con montos por defecto y claves de `SiteConfig` vacías.
3. Para evoluciones posteriores: migraciones incrementales con `prisma migrate dev` y scripts de backfill cuando se agreguen columnas obligatorias.

## Arquitectura de API

### Endpoints principales

| Método | Ruta | Autorización | Descripción |
|--------|------|--------------|-------------|
| `POST` | `/api/admin/members` | Admin | Crear socio. |
| `GET`  | `/api/admin/members` | Admin | Listar socios con filtros/paginación. |
| `GET`  | `/api/admin/members/[id]` | Admin | Obtener socio. |
| `PUT`  | `/api/admin/members/[id]` | Admin | Actualizar socio. |
| `DELETE` | `/api/admin/members/[id]` | Admin | Eliminar solo si no tiene pagos/cuotas. |
| `POST` | `/api/admin/members/import` | Admin | Importar masivamente desde Excel. |
| `GET`  | `/api/admin/members/export` | Admin | Exportar socios filtrados a Excel. |
| `GET/PUT` | `/api/admin/fee-configs` | Admin | Configurar montos por categoría. |
| `POST` | `/api/admin/fees/generate` | Admin/Cron | Generar cuotas del mes. |
| `GET`  | `/api/admin/fees` | Admin | Listar cuotas con filtros. |
| `GET`  | `/api/admin/payments` | Admin | Historial de pagos. |
| `POST` | `/api/admin/payments/[id]/confirm` | Admin | Confirmar transferencia bancaria. |
| `GET`  | `/api/admin/dashboard` | Admin | Métricas del dashboard. |
| `GET`  | `/api/admin/reports/debts` | Admin | Reporte de deudas. |
| `GET`  | `/api/admin/reports/payments` | Admin | Reporte de pagos. |
| `GET`  | `/api/admin/reports/commissions` | Admin | Reporte de comisiones. |
| `POST` | `/api/admin/closings/[id]/close` | Admin | Cerrar período mensual. |
| `POST` | `/api/admin/whatsapp/send` | Admin | Envío masivo de recordatorios. |
| `POST` | `/api/checkout` | Público | Crear pago y redirigir. |
| `POST` | `/api/webhooks/stripe` | Stripe HMAC | Confirmar pago de Stripe. |
| `POST` | `/api/webhooks/mercadopago` | MP HMAC | Confirmar pago de MercadoPago. |
| `GET`  | `/api/member/fees` | Público por DNI | Cuotas del socio. |
| `GET`  | `/api/member/payments` | Público por DNI | Pagos del socio. |
| `GET`  | `/api/cron/overdue` | Secret de cron | Marcar cuotas vencidas. |
| `GET/POST` | `/api/cron/fees` | Secret de cron | Generar cuotas mensuales. |

### Tipos de request/response (ejemplos)

```ts
// POST /api/admin/members
interface CreateMemberRequest {
  dni: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: 'ADULT' | 'FAMILY' | 'MINOR';
  notes?: string;
}

interface CreateMemberResponse {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
}

// POST /api/checkout
interface CheckoutRequest {
  feeId: string;
  method: 'stripe' | 'mercadopago' | 'bank_transfer';
  memberDni: string;
}

interface CheckoutResponse {
  paymentId: string;
  checkoutUrl?: string;
  method: string;
  bankTransfer?: {
    alias: string;
    cbu: string;
    cuit: string;
    bankName: string;
    accountHolder: string;
    reference: string;
  };
}
```

### Autenticación y autorización

- **Administradores**: NextAuth.js con estrategia `credentials` contra `AdminUser`. Sesión JWT con rol `ADMIN`.
- **Portal de socios**: sin sesión. El DNI se recibe como parámetro/query y se valida contra `Member.dni`. No se considera credencial de alta seguridad según las specs.
- **Cron jobs**: protegidos por `CRON_SECRET` en header `Authorization`.
- **Webhooks**: autenticación por firma HMAC de cada proveedor, no por sesión.

### Manejo de errores

- Helper `apiError(message, status, details?)` y `apiSuccess(data)` en `src/lib/api-response.ts`.
- Errores Zod devuelven 400 con lista de campos inválidos.
- Conflictos de negocio (DNI duplicado, cuota ya pagada, período cerrado) devuelven 409.
- Errores inesperados devuelven 500 y se loguean en consola.

### Rate limiting

- Vercel Edge Config o `@upstash/ratelimit` para proteger endpoints públicos:
  - `/api/checkout`: 10 requests/minuto por IP.
  - `/api/member/fees`: 30 requests/minuto por IP.
  - `/api/admin/members/import`: 5 requests/hora por admin.
- Envío masivo de WhatsApp limitado a 50 mensajes/segundo en el worker.

## Integración de pagos

### Stripe

1. `POST /api/checkout` crea un `Payment` en `PENDING` con `method=stripe`.
2. Llama a `stripe.checkout.sessions.create` con:
   - `client_reference_id: paymentId`
   - `metadata: { feeId, memberId }`
   - `success_url: /pagos/confirmacion?payment_id={paymentId}&provider=stripe&status=success`
   - `cancel_url: /pagos/confirmacion?payment_id={paymentId}&provider=stripe&status=cancelled`
3. Guarda `stripeSessionId` en `Payment`.
4. `POST /api/webhooks/stripe` verifica la firma, escucha `checkout.session.completed` y ejecuta `confirmPayment(paymentId, stripePaymentId)`.

### MercadoPago

1. Crea preferencia con `external_reference: feeId` y `metadata: { paymentId, feeId }`.
2. Guarda `mercadopagoPreferenceId` en `Payment`.
3. `POST /api/webhooks/mercadopago` valida firma `x-signature`, consulta el pago con `getMercadoPagoPayment(id)` y ejecuta `confirmPayment` si el estado es `approved`.

### Transferencia bancaria

1. El portal muestra los datos bancarios leídos de `SiteConfig`.
2. El socio envía el comprobante (vista previa en frontend) y el backend crea `Payment` con `method=bank_transfer` y `bankTransferRef`.
3. El administrador usa `POST /api/admin/payments/[id]/confirm` para marcar `PAID`.

### Sincronización de estados

```ts
// src/lib/payments.ts
async function confirmPayment(paymentId: string, opts: {
  stripePaymentId?: string;
  mercadopagoPaymentId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { fee: true } });
    if (!payment || payment.status === 'PAID' || payment.fee.status === 'PAID') {
      return { status: 'already-paid' };
    }
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', confirmedAt: new Date(), ...opts },
    });
    await tx.fee.update({ where: { id: payment.feeId }, data: { status: 'PAID' } });
    const commission = await createCommission(tx, updatedPayment);
    return { status: 'paid', payment: updatedPayment, commission };
  });
}
```

- Pago fallido: `Payment.status = FAILED`, `Fee` permanece `PENDING` o `OVERDUE`.
- Webhook duplicado: la transacción detecta `status === PAID` y responde idempotente.

## Integración con WhatsApp

### Configuración de Meta Cloud API

- Variables de entorno: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`.
- Endpoint base: `https://graph.facebook.com/v18.0/{phone-number-id}/messages`.

### Plantilla de recordatorio

- Nombre: `payment_reminder` (pre-aprobada en Meta).
- Parámetros: `[nombre_socio, monto, fecha_vencimiento, alias, cbu]`.
- Tipo de mensaje: `template` con lenguaje `es`.

### Envío masivo

```ts
// src/lib/whatsapp.ts
export async function sendBulkReminders(memberIds: string[], batchSize = 50) {
  for (let i = 0; i < memberIds.length; i += batchSize) {
    const batch = memberIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => sendReminder(id).catch(logError)));
    if (i + batchSize < memberIds.length) await sleep(1000);
  }
}
```

- 50 mensajes/segundo como máximo.
- Cada intento crea un `WhatsAppLog` con estado `SENT`, `FAILED` o `PENDING`.
- Reintento ante límite de tasa: espera 1 segundo y reenvía el lote.

### Seguimiento de entregas

- `externalId` guarda el `messages[id]` devuelto por Meta.
- En una fase posterior se puede agregar webhook de estados de entrega; en el MVP se registra el ID de envío.

## Arquitectura frontend

### Estructura de rutas

```
src/app/
├── admin/
│   ├── page.tsx                 # Dashboard
│   ├── socios/
│   │   ├── page.tsx             # Listado
│   │   ├── nuevo/page.tsx       # Alta
│   │   └── [id]/page.tsx        # Edición
│   ├── cuotas/
│   │   ├── page.tsx             # Listado
│   │   └── generar/page.tsx     # Generación mensual
│   ├── pagos/
│   │   └── page.tsx             # Historial
│   ├── comisiones/
│   │   ├── page.tsx             # Reporte
│   │   └── cierre/page.tsx      # Cierre mensual
│   ├── reportes/
│   │   ├── deudas/page.tsx
│   │   └── pagos/page.tsx
│   └── configuracion/page.tsx   # FeeConfig, SiteConfig, tasa
├── pagos/
│   ├── page.tsx                 # Ingreso por DNI
│   └── confirmacion/page.tsx    # Éxito/fracaso del pago
├── api/...
└── layout.tsx
```

### Jerarquía de componentes

- **Admin**:
  - `AdminLayout` con `AdminSidebar`.
  - `StatsCards`, `MemberList`, `FeeList`, `PaymentList`.
  - `CommissionReport`, `MonthlyClosingForm`, `ReportFilter`, `ExportButton`.
  - `BulkImportForm` para Excel.
- **Portal**:
  - `PaymentPortal`, `FeeCard`, `PaymentMethodSelector`, `PaymentConfirmation`.
  - `BankTransferInfo` para mostrar alias/CBU.

### Manejo de estado

- Server Components por defecto; datos obtenidos mediante Server Actions o `fetch` a la API.
- Client Components solo para interacción: modales, formularios, selección de método de pago.
- Estado local con `useState`/`useReducer`; sin store global necesario en el MVP.

### Estilos

- Tailwind CSS con configuración base.
- `shadcn/ui` para tablas, formularios, diálogos, botones y selectores.
- Layout responsive; el portal prioriza vista móvil.

## Sistema de comisiones

### Cálculo

```ts
// src/lib/commissions.ts
async function createCommission(tx: PrismaTransaction, payment: Payment) {
  const rate = await getCommissionRate(tx); // desde SiteConfig
  const amount = Math.round(payment.amount * rate) / 100;
  return tx.commission.create({
    data: {
      paymentId: payment.id,
      feeId: payment.feeId,
      amount,
      rate,
    },
  });
}
```

- La tasa se lee de `SiteConfig` con clave `commission_rate`.
- Se congela la tasa en el registro de comisión.

### Cierre mensual

1. Admin ejecuta `POST /api/admin/closings/[id]/close`.
2. Se suman `Commission.amount` de comisiones sin `periodId` dentro del mes/año.
3. Se actualizan las comisiones con `periodId`.
4. Se crea/actualiza `MonthlyClosing` con `status=CLOSED`, `totalPayments`, `totalCommissions` y `commissionRate` (tasa promedio ponderada o tasa vigente).
5. Si ya existe un cierre cerrado para el período, se devuelve 409.

### Reportes

- Reporte por período: detalle de comisiones con método de pago, monto, tasa y totalizadores.
- Exportación a Excel con encabezados, datos y totales.

## Estructura del proyecto

```
libres-cobros/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── pagos/
│   │   └── api/
│   ├── components/
│   │   ├── admin/
│   │   ├── member/
│   │   └── ui/            # shadcn/ui
│   ├── lib/
│   │   ├── db.ts
│   │   ├── api-response.ts
│   │   ├── payments.ts
│   │   ├── stripe.ts
│   │   ├── mercadopago.ts
│   │   ├── whatsapp.ts
│   │   ├── commissions.ts
│   │   ├── reports.ts
│   │   ├── auth.ts
│   │   └── excel.ts       # helper xlsx
│   ├── types/
│   │   ├── member.ts
│   │   ├── fee.ts
│   │   ├── payment.ts
│   │   ├── commission.ts
│   │   └── checkout.ts
│   └── styles/
├── public/
├── openspec/
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

## Despliegue y configuración

### Vercel

- `vercel.json` con redirecciones mínimas y configuración de cron jobs.
- Build command: `prisma generate && next build`.
- Output: serverless functions estándar.

### Variables de entorno

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_CLIENT_SECRET=
MERCADOPAGO_PUBLIC_KEY=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_TEMPLATE_NAME=payment_reminder
CRON_SECRET=
NEXT_PUBLIC_URL=
```

### Base de datos

- PostgreSQL en Vercel Postgres, Supabase o proveedor similar.
- Ejecutar `prisma migrate deploy` en el paso de build/deploy.
- Seed inicial opcional en preview con `prisma db seed`.

### Cron jobs

```json
{
  "crons": [
    { "path": "/api/cron/overdue", "schedule": "0 6 * * *" },
    { "path": "/api/cron/fees", "schedule": "0 6 1 * *" }
  ]
}
```

- `overdue`: todos los días a las 06:00 marca cuotas `PENDING` con `dueDate < hoy` como `OVERDUE`.
- `fees`: el día 1 de cada mes genera cuotas para socios activos (puede ejecutarse manualmente también).

## Estrategia de testing

| Capa | Qué probar | Cómo |
|------|------------|------|
| Unitario | Cálculo de comisiones, normalización de teléfonos, parseo de Excel | Jest + funciones puras |
| Integración | ABM de socios, generación de cuotas idempotente, confirmación de pagos | Supertest sobre handlers API + base de datos de test |
| Webhooks | Verificación de firmas, idempotencia, estados de pago | Requests firmadas con fixtures |
| E2E | Flujo portal DNI → pago → confirmación | Playwright |

## Matriz de amenazas

No aplica: el diseño no modifica enrutamiento de shell, comandos de subshell, automatización de VCS/PR, clasificación de archivos ejecutables ni integración de procesos externos más allá de llamadas HTTP a APIs conocidas (Stripe, MercadoPago, Meta).

## Migración y rollout

1. Deploy inicial con base de datos vacía.
2. Ejecutar seed para crear admin inicial, categorías y configuraciones por defecto.
3. Importar socios desde Excel.
4. Generar cuotas del mes actual.
5. Configurar webhooks de Stripe y MercadoPago apuntando a `/api/webhooks/*`.
6. Verificar plantilla de WhatsApp en Meta antes de habilitar envíos masivos.

## Preguntas abiertas

1. ¿Se permitirán pagos parciales de una cuota en el MVP? (La spec indica que no, pero la pregunta de confirmación del proposal lo replantea.)
2. ¿La tasa de comisión es única global o puede variar por categoría/método?
3. ¿Se requiere envío de confirmación de pago por WhatsApp además del recordatorio?
4. ¿El cierre mensual bloquea la creación de nuevas comisiones para ese período o solo agrupa las existentes?
