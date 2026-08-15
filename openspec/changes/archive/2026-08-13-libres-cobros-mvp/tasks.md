# Tasks: libres-cobros MVP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 3500–5000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Project scaffold + DB schema + seed | PR 1 (feature/scaffold) | `npx prisma generate && npx prisma migrate dev` | `npm run dev` + Prisma Studio | prisma/, src/lib/db.ts, package.json |
| 2 | Auth + Admin layout + Dashboard shell | PR 2 (feature/auth-admin) | `npm run build` | `/admin/login` → `/admin` | src/lib/auth.ts, src/app/admin/ |
| 3 | Member CRUD API + UI | PR 3 (feature/members) | `npm run build` | `/admin/socios` CRUD flow | src/app/api/admin/members/, src/app/admin/socios/ |
| 4 | Fee management (config + generation + cron) | PR 4 (feature/fees) | `npm run build` | Generate fees → verify via Prisma Studio | src/app/api/admin/fee-configs/, src/app/api/cron/ |
| 5 | Payment processing (checkout + webhooks) | PR 5 (feature/payments) | `npm run build` | Stripe/MP test mode → verify Payment+Fee status | src/lib/payments.ts, src/lib/stripe.ts, src/lib/mercadopago.ts, webhooks |
| 6 | Member portal (DNI → fees → pay) | PR 6 (feature/portal) | `npm run build` | `/pagos` DNI lookup → checkout redirect | src/app/pagos/, src/app/api/member/ |
| 7 | WhatsApp + Commission system | PR 7 (feature/whatsapp-commissions) | `npm run build` | Send reminder → verify WhatsAppLog + Commission | src/lib/whatsapp.ts, src/lib/commissions.ts |
| 8 | Dashboard + Reports + Excel export | PR 8 (feature/reports) | `npm run build` | `/admin` dashboard + export to .xlsx | src/app/admin/reportes/, src/lib/reports.ts |

## Phase 1: Fundación — Scaffold del Proyecto

- [x] 1.1 Inicializar proyecto Next.js 14+ (App Router) con `npx create-next-app@latest libres-cobros --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [x] 1.2 Configurar `tsconfig.json` con paths `@/*` → `./src/*`
- [x] 1.3 Instalar dependencias core: `prisma`, `@prisma/client`, `zod`, `stripe`, `mercadopago`, `next-auth`, `xlsx`, `@upstash/ratelimit`, `@upstash/redis`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `luxon`
- [x] 1.4 Instalar shadcn/ui: `npx shadcn@latest init` y agregar componentes: `button`, `card`, `table`, `dialog`, `input`, `select`, `label`, `badge`, `tabs`, `toast`, `dropdown-menu`, `separator`
- [x] 1.5 Crear `prisma/schema.prisma` con los 9 modelos: `Member`, `FeeConfig`, `Fee`, `Payment`, `Commission`, `MonthlyClosing`, `WhatsAppLog`, `SiteConfig`, `AdminUser` (copiar del design.md líneas 64-213)
- [x] 1.6 Ejecutar `npx prisma migrate dev --name init` para crear la migración inicial
- [x] 1.7 Crear `src/lib/db.ts` — singleton de PrismaClient siguiendo patrón de Tiempo Bakery (proxy con globalThis cache)
- [x] 1.8 Crear `src/lib/api-response.ts` — helpers `apiError()`, `apiSuccess()`, `apiDbError()` (port desde Tiempo Bakery)
- [x] 1.9 Crear `src/types/` con esquemas Zod y tipos: `member.ts` (CreateMemberSchema), `fee.ts`, `payment.ts`, `commission.ts`, `checkout.ts` (CheckoutRequestSchema)
- [x] 1.10 Crear `prisma/seed.ts` — admin inicial (`admin@libres.com` / hash bcrypt), categorías ADULT/FAMILY/MONTH con FeeConfig por defecto, SiteConfig keys vacías
- [x] 1.11 Crear `.env.example` con todas las variables de entorno del design.md (líneas 555-570)
- [x] 1.12 Configurar `vercel.json` con cron jobs: `overdue` (0 6 * * *) y `fees` (0 6 1 * *)
- [x] 1.13 Configurar scripts en `package.json`: `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `vercel-build`
- [x] 1.14 Crear `src/app/globals.css` con imports de shadcn/ui y variables CSS base

## Phase 2: Auth + Admin Shell

- [x] 2.1 Crear `src/lib/auth.ts` — configuración NextAuth.js con provider `credentials`, adapter Prisma, sesión JWT con rol `ADMIN`
- [x] 2.2 Crear `src/app/api/auth/[...nextauth]/route.ts` — endpoint NextAuth
- [x] 2.3 Crear `src/app/api/admin/login/route.ts` — POST para login (valida email+password contra AdminUser, retorna cookie) y DELETE para logout
- [x] 2.4 Crear middleware en `src/middleware.ts` — proteger rutas `/admin/*` verificando sesión NextAuth; redirigir a `/admin/login` si no autenticado
- [x] 2.5 Crear `src/app/admin/layout.tsx` — AdminLayout con sidebar responsive (port del patrón Tiempo Bakery, adaptado con navItems: Panel, Socios, Cuotas, Pagos, Comisiones, Reportes, Configuración)
- [x] 2.6 Crear `src/app/admin/login/page.tsx` — formulario de login con email + password, validación Zod, redirección a `/admin` en éxito
- [x] 2.7 Crear `src/app/api/admin/dashboard/route.ts` — GET que retorna: totalSocios, cuotasPendientes, cuotasVencidas, pagosMes, comisionesMes (queries Prisma con conteos)
- [x] 2.8 Crear `src/app/admin/page.tsx` — Dashboard con `StatsCards` (5 tarjetas de métricas), usando Server Component que llama a `/api/admin/dashboard`
- [x] 2.9 Crear `src/components/admin/StatsCards.tsx` — componente de tarjetas de estadísticas con iconos lucide-react

## Phase 3: Gestión de Socios

- [x] 3.1 Crear `src/app/api/admin/members/route.ts` — POST (crear socio, validar DNI único → 409 si duplicado) y GET (listar con filtros: search, category, status, paginación page/limit)
- [x] 3.2 Crear `src/app/api/admin/members/[id]/route.ts` — GET (obtener), PUT (actualizar), DELETE (verificar que no tenga fees/payments antes de eliminar → 409 si tiene registros)
- [x] 3.3 Crear `src/app/api/admin/members/import/route.ts` — POST que recibe Excel (xlsx), parsea filas, valida cada una, crea socios válidos, retorna resumen {imported, errors[]}
- [x] 3.4 Crear `src/app/api/admin/members/export/route.ts` — GET que recibe query params de filtros, genera xlsx con columnas DNI, Nombre, Apellido, Email, Teléfono, Categoría, Estado, Retorna como stream
- [x] 3.5 Crear `src/app/admin/socios/page.tsx` — listado de socios con tabla, barra de búsqueda, filtros de categoría/estado, paginación, botones de importar/exportar
- [x] 3.6 Crear `src/app/admin/socios/nuevo/page.tsx` — formulario de alta de socio (DNI, nombre, apellido, email, teléfono, categoría select, notas)
- [x] 3.7 Crear `src/app/admin/socios/[id]/page.tsx` — formulario de edición con los mismos campos, carga datos existentes
- [x] 3.8 Crear `src/components/admin/MemberForm.tsx` — componente reutilizable de formulario de socio (used by nuevo y [id])
- [x] 3.9 Crear `src/components/admin/MemberList.tsx` — tabla de socios con columnas, badge de estado, menú de acciones (editar, desactivar)
- [x] 3.10 Crear `src/components/admin/BulkImportForm.tsx` — componente para drag-and-drop de Excel, vista previa, botón de importar

## Phase 4: Gestión de Cuotas

- [x] 4.1 Crear `src/app/api/admin/fee-configs/route.ts` — GET (listar configs) y PUT (actualizar montos por categoría, validar que amount > 0)
- [x] 4.2 Crear `src/app/api/admin/fees/route.ts` — GET (listar cuotas con filtros: memberId, status, month, year, paginación)
- [x] 4.3 Crear `src/app/api/admin/fees/generate/route.ts` — POST que genera cuotas del mes: para cada Member.active, crear Fee con monto snapshot de FeeConfig, dueDate = día 10, status=PENDING. Idempotente: omitir si ya existen para [memberId, month, year]
- [x] 4.4 Crear `src/app/api/cron/overdue/route.ts` — GET protegido por CRON_SECRET, marca Fee.status = OVERDUE donde status=PENDING y dueDate < hoy
- [x] 4.5 Crear `src/app/api/cron/fees/route.ts` — GET/POST protegido por CRON_SECRET, ejecuta la misma lógica de generación que 4.3
- [x] 4.6 Crear `src/app/admin/cuotas/page.tsx` — listado de cuotas con filtros por estado, período, socio, tabla con badge de estado (PENDING=amarillo, PAID=verde, OVERDUE=rojo)
- [x] 4.7 Crear `src/app/admin/cuotas/generar/page.tsx` — interfaz para seleccionar mes/año y ejecutar generación, mostrar resumen de cuotas creadas
- [x] 4.8 Crear `src/components/admin/FeeList.tsx` — tabla de cuotas con columnas: Socio, Período, Monto, Vencimiento, Estado, Acciones

## Phase 5: Procesamiento de Pagos

- [x] 5.1 Crear `src/lib/payments.ts` — función `confirmPayment(paymentId, opts)` con transacción Prisma que: actualiza Payment a PAID, actualiza Fee a PAID, crea Commission. Idempotente: retorna `already-paid` si Fee ya está PAID
- [x] 5.2 Crear `src/lib/stripe.ts` — wrapper: `createStripeCheckoutSession({paymentId, feeId, memberId, amount, successUrl, cancelUrl})` que llama a `stripe.checkout.sessions.create` con metadata
- [x] 5.3 Crear `src/lib/mercadopago.ts` — wrapper: `createMercadoPagoPreference({paymentId, feeId, amount, memberName, successUrl, failureUrl, pendingUrl, notificationUrl})` usando patrón de Tiempo Bakery
- [x] 5.4 Crear `src/app/api/checkout/route.ts` — POST que: valida FeeId+method, verifica Fee está PENDING, crea Payment PENDING, llama al proveedor correspondiente, retorna {paymentId, checkoutUrl} o {paymentId, bankTransfer:{alias,cbu,cuit,...}}
- [x] 5.5 Crear `src/app/api/webhooks/stripe/route.ts` — POST que: verifica firma HMAC, escucha `checkout.session.completed`, busca Payment por stripeSessionId, llama `confirmPayment()`
- [x] 5.6 Crear `src/app/api/webhooks/mercadopago/route.ts` — POST que: verifica firma x-signature, consulta pago con `getMercadoPagoPayment(id)`, si estado=approved llama `confirmPayment()`
- [x] 5.7 Crear `src/app/api/admin/payments/route.ts` — GET (listar pagos con filtros: memberId, method, status, dateRange)
- [x] 5.8 Crear `src/app/api/admin/payments/[id]/confirm/route.ts` — POST para confirmar transferencia bancaria: busca Payment PENDING con method=bank_transfer, llama `confirmPayment()`
- [x] 5.9 Crear `src/app/admin/pagos/page.tsx` — historial de pagos con tabla, filtros por método/estado/fecha, botón de confirmar transferencias pendientes
- [x] 5.10 Crear `src/components/admin/PaymentList.tsx` — tabla de pagos con columnas: Socio, Cuota, Monto, Método, Estado, Fecha, Acciones

## Phase 6: Portal de Socios

- [x] 6.1 Crear `src/app/api/member/fees/route.ts` — GET que recibe `?dni=XXX`, valida socio, retorna sus cuotas ordenadas por año/mes
- [x] 6.2 Crear `src/app/api/member/payments/route.ts` — GET que recibe `?dni=XXX`, retorna pagos del socio
- [x] 6.3 Crear `src/app/pagos/page.tsx` — página principal: input de DNI, botón buscar, si existe muestra `PaymentPortal` con listado de cuotas
- [x] 6.4 Crear `src/app/pagos/confirmacion/page.tsx` — pantalla de confirmación post-pago: lee query params (payment_id, provider, status), muestra comprobante o error
- [x] 6.5 Crear `src/components/member/PaymentPortal.tsx` — listado de cuotas del socio con `FeeCard` para cada una
- [x] 6.6 Crear `src/components/member/FeeCard.tsx` — tarjeta de cuota: período, monto, estado (badge), fecha vencimiento, botón de pago si PENDING/OVERDUE
- [x] 6.7 Crear `src/components/member/PaymentMethodSelector.tsx` — modal/dialog para elegir método: Stripe, MercadoPago, Transferencia bancaria
- [x] 6.8 Crear `src/components/member/BankTransferInfo.tsx` — muestra datos bancarios (alias, CBU, CUIT, titular) leídos de SiteConfig
- [x] 6.9 Crear `src/components/member/PaymentConfirmation.tsx` — pantalla de resultado: monto, fecha, método, estado (éxito/error)

## Phase 7: WhatsApp + Sistema de Comisiones

- [x] 7.1 Crear `src/lib/whatsapp.ts` — cliente Meta Cloud API: `sendTemplateMessage(phoneNumber, templateName, params)`, `sendBulkReminders(memberIds, batchSize=50)` con throttling (1s entre lotes), `normalizePhone()` para formato internacional
- [x] 7.2 Crear `src/app/api/admin/whatsapp/send/route.ts` — POST que recibe filtros (category, status, month/year), busca socios con cuotas pendientes + teléfono, ejecuta `sendBulkReminders()`, retorna contadores {sent, failed, skipped}
- [x] 7.3 Crear `src/lib/commissions.ts` — `createCommission(tx, payment)` que lee tasa de SiteConfig, calcula `amount = payment.amount * rate / 100`, crea registro Commission con snapshot de tasa
- [x] 7.4 Crear `src/app/api/admin/closings/route.ts` — GET (listar cierres) y POST (crear cierre OPEN para un período)
- [x] 7.5 Crear `src/app/api/admin/closings/[id]/close/route.ts` — POST que: suma Commission.amount sin periodId en el mes/año, asigna periodId, crea/actualiza MonthlyClosing con status=CLOSED y totales. Retorna 409 si ya está cerrado
- [x] 7.6 Crear `src/app/admin/comisiones/page.tsx` — reporte de comisiones con tabla, filtro por período, totales, botón de exportar Excel
- [x] 7.7 Crear `src/app/admin/comisiones/cierre/page.tsx` — interfaz de cierre mensual: seleccionar período, ver comisiones pendientes, botón de cerrar
- [x] 7.8 Crear `src/components/admin/CommissionReport.tsx` — tabla de comisiones con columnas: Fecha, Socio, Cuota, Monto Pago, Tasa, Comisión, Método
- [x] 7.9 Crear `src/components/admin/MonthlyClosingForm.tsx` — formulario de cierre con resumen antes de confirmar

## Phase 8: Dashboard + Reportes + Exportación

- [x] 8.1 Crear `src/lib/reports.ts` — funciones: `generateDebtReport(filters)`, `generatePaymentReport(filters)`, `generateCommissionReport(filters)`, cada una retorna datos estructurados para xlsx
- [x] 8.2 Crear `src/lib/excel.ts` — helper: `generateExcel(headers, rows, filename)` usando librería xlsx, retorna buffer con content-type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- [x] 8.3 Crear `src/app/api/admin/reports/debts/route.ts` — GET con filtros (month, year, category), retorna socios con cuotas PENDING/OVERDUE y monto total adeudado
- [x] 8.4 Crear `src/app/api/admin/reports/payments/route.ts` — GET con filtros (dateRange, method, memberId), retorna pagos confirmados
- [x] 8.5 Crear `src/app/api/admin/reports/commissions/route.ts` — GET con filtros (periodId), retorna comisiones con totales
- [x] 8.6 Crear `src/app/api/admin/reports/export/route.ts` — GET que recibe `type=debts|payments|commissions` + filtros, genera xlsx y retorna como descarga
- [x] 8.7 Crear `src/app/admin/reportes/deudas/page.tsx` — reporte de deudas con tabla, filtro por período, botón exportar
- [x] 8.8 Crear `src/app/admin/reportes/pagos/page.tsx` — historial de pagos con filtros, botón exportar
- [x] 8.9 Crear `src/app/admin/configuracion/page.tsx` — gestión de FeeConfig (montos por categoría), SiteConfig (tasa comisión, datos bancarios, WhatsApp credentials)
- [x] 8.10 Crear `src/components/admin/ReportFilter.tsx` — controles de filtro reutilizables (período, categoría, método, estado)
- [x] 8.11 Crear `src/components/admin/ExportButton.tsx` — botón que llama a `/api/admin/reports/export` con los filtros activos y descarga el xlsx

## Phase 9: Configuración y Deploy

- [x] 9.1 Crear `src/app/layout.tsx` — root layout con metadata (título, descripción), import globals.css
- [x] 9.2 Crear `src/app/page.tsx` — landing page con redirect a `/pagos` o `/admin`
- [x] 9.3 Configurar `next.config.mjs` con `serverExternalPackages: ['mercadopago']` y optimizaciones
- [x] 9.4 Verificar que `npm run build` compila sin errores
- [x] 9.5 Verificar que `npm run lint` pasa sin errores
- [x] 9.6 Ejecutar seed completo: `npx prisma db seed` y verificar datos en Prisma Studio
- [x] 9.7 Documentar flujo de deploy en README: Variables de entorno, migraciones, seed, cron jobs
