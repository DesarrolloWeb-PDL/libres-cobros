# Especificación: Notificaciones WhatsApp

## Propósito
Enviar recordatorios y confirmaciones de pago a los socios a través de la API de WhatsApp Business de Meta, registrando cada envío para auditoría.

## Modelo de datos

```prisma
model WhatsAppLog {
  id         String   @id @default(cuid())
  memberId   String
  type       String   // REMINDER, CONFIRMATION, MANUAL
  message    String
  status     String   // SENT, FAILED, PENDING
  externalId String?  // WhatsApp API message ID
  error      String?
  sentAt     DateTime @default(now())
  member     Member   @relation(fields: [memberId], references: [id])
  @@index([memberId])
  @@index([sentAt])
  @@index([type])
}

model SiteConfig {
  id    String @id @default(cuid())
  key   String @unique
  value String
  updatedAt DateTime @updatedAt
}
```

## Requisitos

### Requisito: Integración con Meta Cloud API
El sistema DEBE enviar mensajes de plantilla a través de la API de WhatsApp Business de Meta usando un token de acceso y un número de teléfono verificado.

#### Escenario: Envío individual exitoso
- DADO un socio con teléfono `+5491112345678` y una cuota `PENDING`
- CUANDO el administrador envía un recordatorio desde el panel
- ENTONCES el sistema DEBE llamar a la API de Meta, registrar el `externalId` y guardar el log con estado `SENT`.

#### Escenario: Teléfono no registrado
- DADO un socio sin número de teléfono
- CUANDO se intenta enviar un mensaje
- ENTONCES el sistema DEBE omitir el envío y registrar el log con estado `FAILED` indicando "teléfono ausente".

### Requisito: Plantilla de recordatorio
El sistema DEBE usar la plantilla `payment_reminder` aprobada por Meta con parámetros dinámicos.

#### Escenario: Renderizado de plantilla
- DADO un socio llamado `Juan Pérez` con cuota de `5000` vencida el `10/09/2026`
- CUANDO se envía el recordatorio
- ENTONCES el mensaje DEBE incluir el nombre, monto, fecha de vencimiento, alias y CBU configurados.

### Requisito: Envío masivo
El sistema DEBE permitir enviar recordatorios a múltiples socios filtrados por estado de cuota, categoría o período.

#### Escenario: Envío masivo con lotes
- DADOS 150 socios con cuotas `PENDING` o `OVERDUE` del mes actual
- CUANDO el administrador ejecuta el envío masivo
- ENTONCES el sistema DEBE procesar los envíos en lotes de 50 mensajes por segundo como máximo y mostrar un contador de progreso.

#### Escenario: Envío masivo sin destinatarios
- DADO un filtro que no arroja socios con teléfono y cuota pendiente
- CUANDO el administrador ejecuta el envío masivo
- ENTONCES el sistema DEBE mostrar una advertencia y no realizar llamadas a la API.

### Requisito: Registro de entregas
El sistema DEBE guardar un log por cada intento de envío con estado final y error si corresponde.

#### Escenario: Fallo de API
- DADO un error de red en la llamada a Meta
- CUANDO se intenta enviar un mensaje
- ENTONCES el sistema DEBE registrar el log con estado `FAILED` y el mensaje de error devuelto.

## Reglas de negocio
- Solo se envían mensajes a socios con teléfono válido y configurado.
- El envío masivo DEBE respetar el límite de 50 mensajes por segundo.
- Las plantillas DEBEN estar previamente aprobadas en Meta.
- El alias y CBU para transferencia se leen desde `SiteConfig`.

## Casos límite
- API de Meta devuelve límite de tasa: el sistema DEBE pausar y reintentar el lote.
- Socio con código de país incorrecto: el sistema DEBE normalizar el número o marcar el log como `FAILED`.
- Mensaje a socio inactivo: se permite si tiene cuotas pendientes.
