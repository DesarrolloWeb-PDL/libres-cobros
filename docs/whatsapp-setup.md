# Guía de Setup - WhatsApp Cloud API (Meta)

## Requisitos

1. **Facebook Business Account** (o crear una)
2. **WhatsApp Business Account**
3. **Número de teléfono** (puede ser tu número actual de WhatsApp)
4. **Facebook Developer Account**

## Pasos

### 1. Crear Facebook Business Account

1. Ir a [business.facebook.com](https://business.facebook.com)
2. Crear una cuenta de negocio
3. Completar información del negocio

### 2. Crear WhatsApp Business Account

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear una app → Seleccionar "Business" como tipo
3. En "Add Products", agregar **WhatsApp**
4. Ir a **WhatsApp > Getting Started**
5. Seleccionar o crear una WhatsApp Business Account

### 3. Obtener Phone Number ID

1. En **WhatsApp > Getting Started**, copiar el **Phone Number ID**
2. Este es el ID de tu número de teléfono en WhatsApp Business

### 4. Obtener Access Token

1. En **WhatsApp > Getting Started**, copiar el **Temporary Access Token**
2. Para producción, crear un **System User** con un token permanente:
   - Ir a **Business Settings > System Users**
   - Crear un usuario del sistema
   - Asignar permisos de WhatsApp
   - Generar un token con los permisos necesarios

### 5. Configurar en el Club

En la base de datos `siteConfig`, agregar:

```sql
INSERT INTO "SiteConfig" ("id", "clubId", "key", "value", "updatedAt")
VALUES 
  ('1', 'TU_CLUB_ID', 'whatsapp_phone_number_id', 'TU_PHONE_NUMBER_ID', NOW()),
  ('2', 'TU_CLUB_ID', 'whatsapp_access_token', 'TU_ACCESS_TOKEN', NOW());
```

O usar el panel de administración del club (pendiente de implementar).

### 6. Verificar Número

1. En **WhatsApp > Getting Started**, hacer clic en **Send Message**
2. Ingresar tu número de teléfono
3. Recibirás un mensaje de WhatsApp desde tu número de prueba
4. Responder "hello" para verificar

## Limitaciones del Sandbox

- Solo puedes enviar mensajes a números que hayan verificado
- Límite de 24 horas para conversaciones iniciadas por el usuario
- Para producción, necesitas solicitar revisión de Meta

## Producción

1. En **WhatsApp > Settings**, cambiar a modo **Live**
2. Solicitar revisión de plantillas de mensajes
3. Los recordatorios de pago son mensajes transaccionales (no necesitan plantilla aprobada)

## Costos

- **Sandbox**: GRATIS
- **Producción**: GRATIS hasta 1,000 conversaciones/mes
- Conversaciones de servicio (iniciadas por el usuario): GRATIS
- Conversaciones de marketing (iniciadas por el negocio): $0.05-0.10 USD por conversación

## Notas Importantes

- Los recordatorios de pago son **conversaciones transaccionales** (responden a una solicitud del usuario)
- No necesitan plantilla aprobada
- El límite de 1,000 conversaciones/mes es más que suficiente para un club de pádel
