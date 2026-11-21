# Checklist de configuración por institución

Pasos exactos para cargar cada key desde el panel de administración.
Panel → **Configuración** (pestañas: *Datos bancarios · Medios de pago · Facturación ARCA · Mensajería*).

> **Regla de oro:** el orden importa. Cada paso habilita el siguiente (los toggles
> solo aparecen cuando su key está cargada).

---

## Orden de carga

| # | Paso | Pestaña | Habilita |
|---|------|---------|----------|
| 1 | Datos de la institución + logo | Panel / Apariencia | Branding del portal de socios (`/pagos/<slug>`) |
| 2 | Datos bancarios | Datos bancarios | Toggle "Ofrecer transferencia" |
| 3 | Credenciales de cobro (MP y/o Stripe) | Medios de pago | Toggle "Ofrecer MP/Stripe a los socios" |
| 4 | WhatsApp (+ plantilla) o Email | Mensajería | Recordatorios, campañas y mensajes |
| 5 | Certificados ARCA (opcional) | Facturación ARCA | Comprobantes electrónicos (Recibo C) |
| 6 | Socios → Planes → Cuotas | Socios / Cuotas | Primer cobro |

---

## 1. WhatsApp (Mensajería) — recordatorios y campañas

**Campos:** `Phone Number ID` · `Access Token` · `Plantilla de recordatorios` · `Idioma de la plantilla`

- [ ] **Phone Number ID y Access Token** — seguir la guía completa: [`docs/whatsapp-setup.md`](./whatsapp-setup.md)
      (resumen: Meta Business → app tipo Business → producto WhatsApp → *Getting Started* → copiar
      Phone Number ID y Access Token; en producción, token permanente vía System User).
- [ ] **Plantilla de recordatorios** — obligatoria para enviar fuera de la ventana de 24h.
  1. En Meta: **WhatsApp → Message templates** → crear plantilla tipo *Utility*, idioma `es_AR`.
  2. Cuerpo sugerido (4 variables en este orden exacto):

     ```
     Hola {{1}}, te recordamos tu cuota.
     Cuota: {{2}} - Vencimiento: {{3}}.
     Paga acá: {{4}}
     ```
  3. Esperar la aprobación de Meta (minutos u horas).
  4. Pegar el **nombre** de la plantilla en `Plantilla de recordatorios`
     (ej: `recordatorio_pago`) y el idioma en `Idioma de la plantilla` (ej: `es_AR`).
- [ ] **Plantilla de códigos de acceso (OTP al portal)** — solo si activás
      **"Acceso verificado por código (OTP)"**. El socio ingresa su DNI y recibe
      un código por WhatsApp para entrar al portal.
  1. En Meta: crear plantilla tipo *Authentication* o *Utility*, idioma `es_AR`,
     con **1 sola variable**:

     ```
     Tu código de acceso es {{1}}. Válido por 10 minutos.
     ```
  2. Esperar la aprobación de Meta.
  3. Pegar el nombre en `Plantilla de códigos de acceso`.
  4. Activar el switch **"Acceso verificado por código (OTP)"**.
  > Sin plantilla ni email configurados, el portal queda con acceso por DNI
  > (sin código) para no dejar afuera a los socios.
- [ ] **Modo de prueba del portal (opcional, sin WhatsApp)** — para verificar el
      flujo DNI → código → ingreso sin configurar canales:
  1. En *Mensajería*, cargar `Código de prueba (solo testing)` con un valor fijo
     (ej: `55667788`, hasta 8 caracteres).
  2. Mientras ese campo tenga valor, el portal **pide ese código** para ingresar
     en esa institución (el interruptor OTP debe estar activado).
  3. Probá en `/pagos/<slug>`: DNI → código → adentro.
  4. **Al terminar, vaciar el campo** — mientras esté cargado, cualquiera que
     sepa el código y un DNI puede entrar a esa institución (esa advertencia
     queda visible en el panel a propósito).
- [ ] Si dejás la plantilla **vacía**, los mensajes salen como texto libre — solo
      funcionarán si el socio escribió primero en las últimas 24h.

**Prueba:** Panel → *Mensajes* → enviar un mensaje individual a un socio de prueba.

---

## 2. Medios de pago

### Mercado Pago
- [ ] **Access Token** — cuenta MP → *Desarrolladores → Credenciales* → Access Token de
      **producción** (empieza con `APP_USR-`). Campo: `Access Token`.
- [ ] Una vez cargado, aparece el toggle **"Ofrecer Mercado Pago a los socios"** → activarlo.
- [ ] Los webhooks de MP se registran solos al activar un débito automático
      (no hay que configurarlos a mano).

### Stripe
- [ ] **Secret Key** — dashboard Stripe → *Developers → API keys* → `sk_live_...`. Campo: `Secret Key`.
- [ ] **Webhook signing secret** — *Developers → Webhooks* → crear endpoint
      `https://<tu-dominio>/api/webhooks/stripe` → copiar el signing secret (`whsec_...`).
- [ ] Activar el toggle **"Ofrecer Stripe a los socios"**.

**Prueba:** Panel → *Débito automático* → generar un link de autorización con un socio de prueba.

---

## 3. Datos bancarios (transferencia)

- [ ] `Alias` · `CBU` · `CUIT` · `Banco` · `Titular` · `Referencia` (todos en *Datos bancarios*).
- [ ] Recién entonces aparece **"Ofrecer transferencia bancaria"** → activarlo.

---

## 4. Email con Resend (alternativa a WhatsApp)

- [ ] `API Key` — resend.com → *API Keys*. Campo: `API Key`.
- [ ] `Email remitente` — dominio verificado en Resend (ej: `Cuotas <cuotas@tudominio.com>`).
- [ ] Prioridad del sistema: **WhatsApp > Email**. Si ambos están cargados, se usa WhatsApp.

---

## 5. Facturación ARCA (opcional)

- [ ] `CUIT de la institución` · `Punto de venta`.
- [ ] `Certificado X.509 (PEM)` y `Clave privada X.509 (PEM)` — descargados de ARCA
      (Certificados → *Descargar clave privada y certificado*).
- [ ] Clic en **"Probar credenciales"** (emite un ticket de acceso sin comprobante) hasta que diga OK.
- [ ] Activar **"Emitir comprobantes electrónicos (ARCA)"**.

---

## Variables de entorno (solo quien despliega — NO van en Configuración)

Se configuran en **Vercel → Project → Settings → Environment Variables**:

| Variable | Obligatoria | Si falta |
|---|---|---|
| `NEXT_PUBLIC_URL` | ✅ | Links de pago, autorización de débito automático y webhooks apuntan a `http://localhost:3000` — **el cobro se rompe en producción** |
| `CRON_SECRET` | ✅ | Los 5 crons (cuotas, vencidos, mensajes, facturación SaaS, reconciliación) no podrán autenticarse y no corren |
| `DATABASE_URL` | ✅ | La app no inicia |

> **Verificación rápida de `NEXT_PUBLIC_URL`:** debe ser el dominio público
> (ej: `https://libres-cobros.vercel.app` o tu dominio custom), sin barra final.

---

## Cómo probar que todo quedó bien

1. **WhatsApp** → Mensajes → mensaje individual de prueba.
2. **MP/Stripe** → Débito automático → link de autorización con socio de prueba.
3. **Transferencia** → portal del socio (`/pagos/<slug>`) → verificar que aparece el dato bancario.
4. **ARCA** → botón "Probar credenciales".
5. **Crons** → Vercel → Deployments → el cron más reciente debe ser *Success*.
6. **Débito automático** → alta de socio con email → checkbox de aceptación → activar → verificar
   el badge *Pendiente de activación* y luego *Activo*.

---

Documentos relacionados: [`whatsapp-setup.md`](./whatsapp-setup.md) ·
[`TWILIO_SETUP.md`](./TWILIO_SETUP.md) · [`CHECKLIST_WALKTHROUGH.md`](./CHECKLIST_WALKTHROUGH.md) ·
[`MANUAL_USUARIO.md`](./MANUAL_USUARIO.md)
