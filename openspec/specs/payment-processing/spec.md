# Especificación: Procesamiento de Pagos

## Propósito
Permitir a los socios abonar sus cuotas a través de Stripe, MercadoPago o transferencia bancaria, y sincronizar el estado del pago con la cuota correspondiente.

## Modelo de datos

```prisma
model Payment {
  id                   String   @id @default(cuid())
  feeId                String
  memberId             String
  amount               Float
  method               String   // stripe, mercadopago, bank_transfer
  status               String   @default("PENDING") // PENDING, PAID, FAILED, REFUNDED
  stripeSessionId      String?
  stripePaymentId      String?
  mercadopagoPaymentId String?
  mercadopagoPreferenceId String?
  bankTransferRef      String?
  confirmedAt          DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  fee                  Fee      @relation(fields: [feeId], references: [id])
  member               Member   @relation(fields: [memberId], references: [id])
  commissions          Commission[]
  @@index([feeId])
  @@index([memberId])
  @@index([status])
  @@index([stripePaymentId])
  @@index([mercadopagoPaymentId])
}
```

## Requisitos

### Requisito: Creación de checkout
El sistema DEBE crear una sesión de pago asociada a una cuota específica y redirigir al proveedor elegido.

#### Escenario: Checkout con Stripe
- DADO un socio con una cuota `PENDING` de `5000`
- CUANDO el socio selecciona pagar con Stripe
- ENTONCES el sistema DEBE crear un `Payment` en estado `PENDING`, generar una sesión de Stripe y redirigir al checkout.

#### Escenario: Checkout con MercadoPago
- DADO un socio con una cuota `PENDING`
- CUANDO el socio selecciona MercadoPago
- ENTONCES el sistema DEBE crear una preferencia de MercadoPago con `external_reference` igual al `feeId` y redirigir al pago.

### Requisito: Webhook de Stripe
El sistema DEBE escuchar el evento `checkout.session.completed` y confirmar el pago.

#### Escenario: Confirmación por webhook
- DADO un `Payment` en estado `PENDING` con `stripeSessionId` válido
- CUANDO Stripe envía el evento `checkout.session.completed`
- ENTONCES el sistema DEBE marcar el pago como `PAID`, la cuota como `PAID` y ejecutar el cálculo de comisión.

#### Escenario: Webhook no autenticado
- DADO una petición de webhook sin firma válida
- CUANDO el sistema recibe la petición
- ENTONCES el sistema DEBE responder 401 y no modificar ningún estado.

### Requisito: Webhook de MercadoPago
El sistema DEBE procesar notificaciones IPN de MercadoPago y actualizar el estado del pago.

#### Escenario: Pago aprobado
- DADO un `Payment` con `mercadopagoPreferenceId` y una notificación de pago aprobado
- CUANDO el sistema consulta la API de MercadoPago y confirma el estado
- ENTONCES el sistema DEBE marcar el pago y la cuota como `PAID`.

### Requisito: Transferencia bancaria
El sistema DEBE permitir registrar una intención de pago por transferencia y requerir confirmación administrativa.

#### Escenario: Registro de transferencia
- DADO un socio que selecciona transferencia bancaria
- CUANDO ingresa el comprobante o referencia
- ENTONCES el sistema DEBE crear un `Payment` en estado `PENDING` con `method=bank_transfer`.

#### Escenario: Confirmación manual
- DADO un pago por transferencia en estado `PENDING`
- CUANDO el administrador confirma la acreditación
- ENTONCES el sistema DEBE marcar el pago y la cuota como `PAID`.

### Requisito: Sincronización de estados
El sistema DEBE mantener la coherencia entre `Payment.status` y `Fee.status`.

#### Escenario: Pago fallido
- DADO un pago en estado `PENDING`
- CUANDO el webhook informa un fallo
- ENTONCES el sistema DEBE marcar el pago como `FAILED` y mantener la cuota como `PENDING`.

## Reglas de negocio
- El monto del pago DEBE coincidir exactamente con el monto de la cuota.
- Una cuota `PAID` no puede recibir un nuevo pago.
- Los webhooks DEBEN verificar autenticidad antes de procesar.
- La confirmación manual de transferencias requiere rol administrativo.

## Casos límite
- Webhook duplicado: el sistema DEBE ser idempotente y no crear pagos duplicados.
- Pago exitoso de cuota ya vencida: la cuota pasa a `PAID` y no vuelve a `OVERDUE`.
- Redirección de pago abandonado: el `Payment` permanece `PENDING` por 24 horas y luego puede ser cancelado.
