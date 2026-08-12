# Propuesta: MVP libres-cobros

## Resumen del proyecto

Sistema de gestión de cuotas sociales para un club con más de 200 socios. Reemplaza el seguimiento manual por un flujo digital: generación mensual de deudas, portal de pago basado en DNI, notificaciones por WhatsApp, cálculo de comisiones y reportes administrativos.

## Alcance

### Incluido (MVP)
- Registro y administración de socios, categorías y estados.
- Configuración de montos y generación mensual de cuotas.
- Portal de pago por DNI con tres métodos: Stripe, MercadoPago y transferencia bancaria.
- Webhooks de confirmación para pagos digitales y confirmación manual para transferencias.
- Notificaciones WhatsApp individuales y envíos masivos de recordatorios.
- Cálculo de comisiones al confirmar el pago y cierre mensual con reporte.
- Dashboard administrativo con vistas de socios, cuotas, pagos y reportes exportables.

### Fuera de alcance
- Autenticación con contraseña para socios.
- Pagos recurrentes automáticos.
- Soporte multi-moneda.
- Aplicación móvil nativa.

## Capabilities

### Nuevas capabilities
- `member-registry`: ABM de socios y categorías.
- `fee-management`: Configuración de montos y generación mensual de cuotas.
- `payment-processing`: Checkout, webhooks y confirmación de pagos.
- `whatsapp-notifications`: Plantillas y envío masivo de mensajes.
- `commission-system`: Cálculo de comisiones y cierre mensual.
- `admin-dashboard`: Dashboard, socios, cuotas, pagos y reportes.
- `member-portal`: Portal de pago por DNI.
- `reporting-export`: Exportación de deudas, pagos y comisiones.

### Capabilities modificadas
Ninguna: proyecto greenfield.

## Enfoque

### Arquitectura
Fee-First: se pre-generan las cuotas mensuales por socio; los pagos se imputan a una cuota específica. Se reutilizan patrones de Tiempo Bakery para checkout y webhooks.

### Esquema de base de datos
Modelos Prisma principales: `Member`, `FeeConfig`, `Fee`, `Payment`, `Commission`, `MonthlyClosing`, `WhatsAppLog`, `SiteConfig`.

### Rutas API principales
- `POST /api/checkout`: crear pago y redirigir al proveedor.
- `GET/POST /api/admin/members`: ABM de socios.
- `GET/POST /api/admin/fees/generate`: generar cuotas del mes.
- `POST /api/webhooks/stripe` y `POST /api/webhooks/mercadopago`: confirmación de pagos.
- `POST /api/admin/payments/[id]/confirm`: confirmar transferencia bancaria.
- `GET /api/admin/dashboard` y `GET /api/admin/commissions`: reportes.
- `POST /api/admin/closing/[id]/close`: cierre mensual.

### Componentes UI principales
- Admin: `AdminSidebar`, `MemberList`, `FeeList`, `PaymentList`, `CommissionReport`, `StatsCards`.
- Portal: `PaymentPortal`, `FeeCard`, `PaymentMethodSelector`, `PaymentConfirmation`.

### Flujo de pagos
1. El socio ingresa su DNI en `/pagos`.
2. Selecciona la cuota pendiente y el método de pago.
3. Stripe o MercadoPago redirigen al usuario; la transferencia queda pendiente de confirmación.
4. El webhook o la confirmación manual marcan la cuota como `PAID` y generan la comisión.

### WhatsApp
Meta Cloud API directa. Plantilla `payment_reminder` con nombre, monto, vencimiento, alias y CBU. Envío masivo en lotes de 50 mensajes por segundo, con registro en `WhatsAppLog`.

### Comisiones
Porcentaje configurable en `SiteConfig`. Se calcula al confirmar el pago; el cierre mensual agrupa las comisiones del período y genera un reporte.

### Fases de implementación
1. Setup del proyecto y esquema Prisma.
2. ABM de socios y categorías.
3. Configuración de cuotas y generación mensual.
4. Portal de pago y checkout.
5. Webhooks de Stripe y MercadoPago.
6. Confirmación de transferencias y cálculo de comisiones.
7. Integración WhatsApp y envíos masivos.
8. Dashboard, reportes y cierre mensual.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `prisma/schema.prisma` | Nuevo | Modelos de dominio completos. |
| `src/app/api/...` | Nuevo | Endpoints admin, checkout y webhooks. |
| `src/app/admin/...` | Nuevo | Interfaz administrativa. |
| `src/app/pagos/...` | Nuevo | Portal de pago para socios. |
| `src/components/admin/...` | Nuevo | Componentes del dashboard. |
| `src/components/member/...` | Nuevo | Componentes del portal. |
| `src/lib/payments.ts` | Nuevo | Abstracción de proveedores de pago. |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Retraso en verificación de Meta Business | Alta | Iniciar trámite antes del desarrollo; tener email/SMS alternativo. |
| Cambio de tasa de comisión con pagos pendientes | Media | Congelar tasa al crear el pago o definir política clara. |
| Conciliación de transferencias bancarias | Media | Exigir referencia de pago y confirmación administrativa. |

## Plan de rollback

Revertir el merge de la rama `feature/libres-cobros-mvp`; restaurar la base de datos desde un backup previo al deploy; deshabilitar los webhooks de Stripe y MercadoPago hasta nueva orden.

## Dependencias

- Cuentas activas en Stripe y MercadoPago con capacidad para configurar webhooks.
- Cuenta de WhatsApp Business verificada en Meta.
- Base de datos PostgreSQL (por ejemplo, Vercel Postgres o Supabase).

## Criterios de éxito

- [ ] 200+ socios importados y cuotas mensuales generadas correctamente.
- [ ] Pago exitoso de cuotas mediante Stripe, MercadoPago y transferencia bancaria.
- [ ] Envío masivo de recordatorios con log de entregas.
- [ ] Cierre mensual con reporte de comisiones exportable.

## Preguntas de confirmación

1. ¿El MVP permitirá pagos parciales de una cuota o solo pagos totales?
2. ¿Qué ocurre con las cuotas pendientes cuando un socio pasa a `INACTIVE`?
3. ¿La tasa de comisión es única global o puede variar por categoría/método?
4. ¿Priorizamos exportación en Excel, PDF o ambas?
5. ¿Se usará Vercel Cron para marcar cuotas como `OVERDUE`?
