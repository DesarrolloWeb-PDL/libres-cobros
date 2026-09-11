# Guía de Setup: Twilio SMS para Libres Cobros

## Resumen

Libres Cobros soporta envío de recordatorios por SMS usando Twilio. Cada institución configura sus propias credenciales de Twilio desde el panel de administración.

## Prerequisitos

1. **Cuenta de Twilio**: Crear cuenta en [twilio.com](https://www.twilio.com)
2. **Número de teléfono**: Comprar un número de teléfono en Twilio
3. **Credenciales**: Obtener Account SID y Auth Token desde el dashboard de Twilio

## Pasos para Configurar

### 1. Crear Cuenta de Twilio

1. Ir a [twilio.com](https://www.twilio.com) y crear cuenta
2. Completar verificación de teléfono y email
3. Agregar método de pago (requerido para enviar SMS)

### 2. Obtener Credenciales

1. Ir al [Console de Twilio](https://console.twilio.com)
2. En el dashboard, encontrar:
   - **Account SID**: Comienza con "AC"
   - **Auth Token**: Token secreto (click para mostrar)

### 3. Comprar Número de Teléfono

1. En Twilio Console, ir a **Phone Numbers** → **Buy a Number**
2. Buscar número argentino (+54)
3. Seleccionar número que soporte SMS
4. Comprar número (costo aproximado: $1-2 USD/mes)

### 4. Configurar en Libres Cobros

1. Ir a `/admin/configuracion`
2. Seleccionar pestaña **Mensajería**
3. En sección **Twilio SMS (Alternativa)**:
   - **Account SID**: Pegar el Account SID de Twilio
   - **Auth Token**: Pegar el Auth Token de Twilio
   - **Número de teléfono**: Ingresar el número comprado (formato: +541112345678)
4. Click **Guardar configuración**

### 5. Probar Envío

1. Ir a **SMS** en el menú lateral
2. Seleccionar filtros (opcional)
3. Click **Enviar recordatorios**
4. Verificar que el SMS llega al teléfono del socio

## Configuración por Institución

**Importante**: Cada institución tiene sus propias credenciales de Twilio. Esto permite que:

- Cada institución use su propio número de teléfono
- Los mensajes se envíen desde el número de la institución
- Los costos de Twilio se atribuyan a cada institución

## Formato de Teléfono

El sistema normaliza automáticamente los números argentinos:

- `1112345678` → `+541112345678`
- `01112345678` → `+541112345678`
- `+541112345678` → `+541112345678`

## Troubleshooting

### Error: "Configuración de Twilio incompleta"

**Causa**: Faltan credenciales de Twilio configuradas.

**Solución**:
1. Ir a `/admin/configuracion`
2. Completar todos los campos de Twilio
3. Guardar configuración

### Error: "Account SID inválido"

**Causa**: El Account SID no comienza con "AC".

**Solución**:
1. Verificar que el Account SID sea correcto
2. Copiar desde el dashboard de Twilio (no escribir a mano)

### SMS no llega

**Causas posibles**:
1. Número de teléfono incorrecto o incompleto
2. Saldo insuficiente en Twilio
3. Número de teléfono bloqueado o no válido
4. Restricciones de Twilio para números argentinos

**Solución**:
1. Verificar número de teléfono en el perfil del socio
2. Revisar saldo en Twilio Console
3. Verificar logs en la base de datos (`sms_log` table)

### Error: "No se pudo enviar el mensaje"

**Causa**: Error de conexión con Twilio.

**Solución**:
1. Verificar credenciales en `/admin/configuracion`
2. Revisar logs de errores en la base de datos
3. Verificar que Twilio no esté bloqueando el envío

## Costos de Twilio

- **Número de teléfono**: ~$1-2 USD/mes
- **SMS salientes**: ~$0.01-0.02 USD por mensaje
- **SMS entrantes**: Gratis

**Nota**: Los costos son aproximados y pueden variar según el país y el plan de Twilio.

## Alternativa: WhatsApp

Si prefieres usar WhatsApp (gratuito hasta 1,000 conversaciones/mes):

1. Configurar WhatsApp Cloud API en `/admin/configuracion`
2. El sistema detectará automáticamente si WhatsApp está configurado
3. Si ambos están configurados, prioriza WhatsApp sobre SMS

## Seguridad

- Las credenciales de Twilio se almacenan en la base de datos, no en variables de entorno
- Cada institución solo puede ver sus propias credenciales
- Los super admin pueden ver todas las configuraciones
- Nunca exponer credenciales en logs o mensajes de error

## Soporte

Si tenés problemas con la configuración de Twilio:

1. Revisar la documentación de Twilio: [https://www.twilio.com/docs](https://www.twilio.com/docs)
2. Contactar soporte de Twilio desde el dashboard
3. Revisar logs en la base de datos (`sms_log` table)
