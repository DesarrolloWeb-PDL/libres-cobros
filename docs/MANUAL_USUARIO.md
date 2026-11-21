# Manual de Usuario — Libres Cobros

Guía completa para administrar tu institución en la plataforma.
Está pensada para usarse sin conocimientos técnicos: si algo no está acá, escribinos por soporte.

> **¿Sos socio en lugar de administrador?** Tu guía es el
> [Manual del Socio](./MANUAL_SOCIO.md) — cómo entrar, pagar y activar tu débito automático.

**Contenido:**
1. [Primeros pasos](#1-primeros-pasos)
2. [Tu institución: datos y apariencia](#2-tu-institución-datos-y-apariencia)
3. [Socios](#3-socios)
4. [Planes y cuotas](#4-planes-y-cuotas)
5. [Cobros y pagos](#5-cobros-y-pagos)
6. [Débito automático](#6-débito-automático)
7. [Mensajes (WhatsApp y email)](#7-mensajes-whatsapp-y-email)
8. [Comisiones y cierre mensual](#8-comisiones-y-cierre-mensual)
9. [Reportes](#9-reportes)
10. [Configuración completa paso a paso](#10-configuración-completa-paso-a-paso)
11. [Automatismos que corren solos](#11-automatismos-que-corren-solos)
12. [Roles y seguridad](#12-roles-y-seguridad)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. Primeros pasos

El alta ocurre en 4 pasos:

1. **Registro** — completás el formulario de alta con los datos de tu institución.
   La cuenta queda *pendiente de aprobación*.
2. **Aprobación de la plataforma** — un administrador de la plataforma revisa y aprueba.
3. **Configuración** — seguí el [checklist de configuración](./CHECKLIST_CONFIGURACION.md)
   (datos, medios de pago, WhatsApp, ARCA).
4. **Primer cobro** — cargá socios, planes y generá las cuotas.

En el **Panel** vas a ver un **checklist de onboarding** con 5 pasos que te marca
qué falta: datos del club → socios → medios de pago → primeras cuotas → primer mensaje.

---

## 2. Tu institución: datos y apariencia

### Datos
Panel → **Configuración**: nombre, logo, datos de contacto.
El logo y los colores se usan en el **portal de socios** (`/pagos/<slug>`), que es
la página que ven tus socios para pagar.

### Apariencia
Panel → **Apariencia**: elegí los colores de marca (primario, secundario, acento, fondo).
Se aplica al portal de socios y a los mensajes.

---

## 3. Socios

Panel → **Socios**.

### Cargar un socio
1. **Socios → Nuevo socio**.
2. Completá: nombre, DNI, teléfono, email (el **email es obligatorio** si querés
   débito automático o cobros por link), categoría y plan.
3. Guardar.

### Importación masiva
Tenés una planilla con todos tus socios → **Importar** (subís el archivo).
Para verificar qué salió bien, **Exportar** descarga la lista actual.

### Aprobación de socios que llegan por registro
La plataforma expone un endpoint de autorregistro de socios que deja cada alta
en estado *pendiente*. Cuando esté conectado a un formulario, esos socios
aparecen en tu lista para **Aprobar** o **Rechazar**.

### Categorías
Servicio para agrupar socios (ej: *Activo*, *Jubilado*, *Becado*) — se usan en
segmentos de mensajes y reportes.

### Ficha del socio
En la ficha ves: sus cuotas, sus pagos, su estado de deuda, y el botón de
**Débito automático** para activarlo desde ahí ([sección 6](#6-débito-automático)).

---

## 4. Planes y cuotas

### Planes (Panel → **Planes**)
Un plan define **cuánto se cobra y cada cuánto** (ej: *Socio activo — $15.000/mes*).
Podés tener varios planes conviviendo.

> El débito automático toma el monto del **plan del socio**; si no tiene plan,
> usa el plan activo más barato.

### Generar cuotas (Panel → **Cuotas → Generar cuotas**)
1. Elegí el **mes** a generar.
2. **Previsualizá**: te muestra qué socios recibirán cuota, cuáles se saltean
   (ya la tienen) y el total.
3. **Generar**: crea las cuotas en estado *pendiente*.

Esto también lo hace **solo, todos los días 1 del mes** (ver
[sección 11](#11-automatismos-que-corren-solos)) — la generación manual es para
adelantarte o cubrir un mes que faltó.

### Estados de una cuota
- **Pendiente** — todavía no venció.
- **Vencida** — pasó la fecha y no se pagó (la marca el sistema a diario).
- **Pagada** — registraste el pago.

---

## 5. Cobros y pagos

### Registrar un pago en efectivo / transferencia
Panel → **Pagos** → **Registrar pago**: elegí socio, monto y método.
El sistema descuenta la cuota pendiente automáticamente.

### Lo que ve el socio (portal de pagos)
Cada institución tiene una URL propia: `/pagos/<slug>`.
El socio entra con su **DNI** y, si el **acceso verificado por código** está
activado, recibe un **código por WhatsApp** (o email) que debe ingresar para
verificar su identidad — nadie puede ver los datos de otro socio con solo
saber su DNI. El código dura **10 minutos** y admite hasta **5 intentos**.

Una vez verificado, el socio ve:
- sus cuotas pendientes,
- su historial de pagos,
- los medios de pago disponibles: **Mercado Pago**, **Stripe**, **transferencia bancaria**
  (los que estén activados en tu configuración),
- su **débito automático**,
- y el **comprobante** con QR de ARCA si tenés facturación activada.

La sesión dura **7 días**; después debe ingresar el código de nuevo.
El botón **"Cambiar socio"** cierra la sesión (por ejemplo, en un celular prestado).

### Confirmación y reconciliación
- Los pagos por MP/Stripe llegan **solos** vía webhook (sin que hagas nada).
- **Reconciliación** (Panel → Pagos) cruza lo que dice la pasarela con lo registrado,
  por si quedó algo colgado.

### Comprobantes (ARCA)
Si activaste facturación en [Configuración → Facturación ARCA](./CHECKLIST_CONFIGURACION.md),
cada pago confirmado emite un **Recibo C** con CAE y QR verificable.
El socio lo descarga desde su ticket.

---

## 6. Débito automático

La cuota se debita sola todos los meses. Hay dos formas de activarlo:

### La la activa el socio (recomendado)
1. El socio entra a su portal con su DNI.
2. Sección **Débito automático** → marca el **checkbox de aceptación**
   (obligatorio: sin él los botones están deshabilitados).
3. Elige **Mercado Pago** o **Stripe** y confirma.
4. MP redirige a una pantalla donde el socio **autoriza** los débitos; Stripe
   confirma directo.
5. El estado pasa a *Activo* (o *Pendiente de activación* si falta autorizar).

### La activa el administrador
1. Ficha del socio → **Débito automático**.
2. Marcá el **checkbox de confirmación** (dejó constancia de que el socio aceptó).
3. Elegí el medio de pago.
4. Con MP se genera un **link de autorización**: pasásselo al socio y él lo acepta.
   Con Stripe queda activo directo.

### Estados
| Estado | Qué significa | Qué hacer |
|---|---|---|
| Activo | Se debita solo | Nada |
| Pendiente de activación | Falta que el socio autorice | Reenviar link / indicar que revise el email |
| Falló | El último cobro no pasó | Botón *Reintentar* |
| Pausado | Detenido | Contactar soporte |
| Cancelado | El socio o vos lo cancelaron | Reactivar con el botón correspondiente |

**Registro de aceptación:** cada activación guarda **fecha y quién la registró**
(socio por cuenta propia, o administrador en su nombre). Lo podés consultar en la ficha.

---

## 7. Mensajes (WhatsApp y email)

Panel → **Mensajes**.

### Enviar una campaña
1. **Segmento**: socios al día, con deuda o en mora (o todos).
2. **Canal**: WhatsApp o email (el que tengas configurado; si tenés ambos, va WhatsApp).
3. **Mensaje** con variables: `{nombre}` `{monto}` `{vencimiento}`.
4. **Enviar ahora** o **programar**.

### Recordatorios automáticos
El sistema envía recordatorios de cuota pendiente solo
(ver [sección 11](#11-automatismos-que-corren-solos)).

> **Importante sobre WhatsApp:** para enviarle a un socio que no te escribió
> primero hace falta una **plantilla aprobada por Meta**.
> Configurala siguiendo el [checklist, paso WhatsApp](./CHECKLIST_CONFIGURACION.md).
> Sin plantilla, los mensajes solo salen si el socio escribió en las últimas 24 horas.

### Bandeja de entrada
Panel → **Mensajes** muestra las respuestas de los socios (bandeja WhatsApp).

---

## 8. Comisiones y cierre mensual

- **Comisiones** (Panel → Comisiones): si tu modelo cobra comisión sobre lo recaudado,
  este monto se calcula automáticamente.
- **Cierre mensual** (Panel → Comisiones → Cierre): al cerrar el mes queda liquidado
  lo recaudado, las comisiones y los aportes. Se recomienda cerrar **una vez por mes**,
  después de que entren todos los pagos del período.

---

## 9. Reportes

Panel → **Reportes**:

| Reporte | Para qué sirve |
|---|---|
| Deudas | Quién debe y cuánto, por socio |
| Pagos | Todo lo cobrado en un período |
| Comisiones | Lo que corresponde en comisiones |
| Morosidad | Antigüedad de la deuda (quién debe hace cuánto) |
| Por concepto | Desglose por tipo de cobro |

Todos se pueden **exportar**.

---

## 10. Configuración completa paso a paso

El orden importa — cada paso habilita el siguiente:

1. **Datos de la institución** y **Apariencia** (marca del portal).
2. **Datos bancarios** → habilita el botón de transferencia.
3. **Medios de pago** → Access Token de Mercado Pago y/o Secret Key de Stripe
   → habilita los toggles para ofrecerlos a los socios.
4. **WhatsApp** (+ plantilla aprobada) o **Email (Resend)** → habilita recordatorios y campañas.
5. **ARCA** (opcional) → habilita comprobantes electrónicos. Usá *Probar credenciales*.
6. **Categorías → Socios → Planes → Generar cuotas → cobrar → Comisiones/Cierre.**

**Detalle paso a paso con links y campos exactos:**
→ **[`CHECKLIST_CONFIGURACION.md`](./CHECKLIST_CONFIGURACION.md)**

---

## 11. Automatismos que corren solos

Estos procesos están programados y no requieren que hagas nada:

| Automatismo | Cuándo | Qué hace |
|---|---|---|
| Generación de cuotas | El **día 1 de cada mes**, 06:00 | Crea las cuotas del mes para los socios activos |
| Marcaje de vencidas | **Todos los días**, 06:00 | Pasa a *vencida* la cuota que venció sin pago |
| Recordatorios / mensajes | **Cada 5 minutos** | Despacha los mensajes programados y recordatorios |
| Facturación SaaS | Todos los días, 09:00 | (Plataforma) emite la facturación de las instituciones |
| Reconciliación | Programable | Cruza pagos de pasarelas con los registrados |

> Si un automatismo no corre (por ejemplo, faltó una variable de entorno al
> desplegar), los mensajes y cuotas no se generan. Es un tema de configuración
> del despliegue — reportalo a soporte.

---

## 12. Roles y seguridad

| Rol | Qué ve |
|---|---|
| **SUPER_ADMIN** (plataforma) | Todas las instituciones, usuarios, planes de la plataforma |
| **ADMIN** (tu institución) | Solo los datos de **tu** institución |
| **Socio** (sin usuario) | Solo su propia información, identificándose con su **DNI** en el portal |

- Los datos de una institución **nunca** se mezclan con los de otra.
- Los socios **no tienen contraseña**: entran con DNI (+ la información que
  solo ellos conocen). Por eso el DNI es la clave de acceso al portal.
- Cambio de contraseña: `/change-password`.
- Privacidad: `/privacidad` (Ley 25.326 — datos personales).

---

## 13. Preguntas frecuentes

**¿El socio no tiene email, puede usar débito automático?**
No. El email es obligatorio para MP y Stripe. Cargalo en la ficha del socio.

**¿Se puede cancelar un débito automático?**
Sí, desde la ficha del socio o desde el portal del propio socio.

**¿Qué pasa si un cobro automático falla?**
Queda en estado *Falló* y se puede reintentar con un botón.

**¿Puedo cobrar en efectivo?**
Sí — registrás el pago a mano en Panel → Pagos.

**¿Cuánto cuesta WhatsApp?**
Gratis hasta 1.000 conversaciones/mes. Ver [`whatsapp-setup.md`](./whatsapp-setup.md).

**¿Los socios ven los datos de otros socios?**
No. Cada socio solo ve lo suyo.

**¿Y si necesito ayuda?**
Soporte: `/soporte`.

---

*Manual v1.0 — noviembre 2026. Relacionado:*
[`CHECKLIST_CONFIGURACION.md`](./CHECKLIST_CONFIGURACION.md) ·
[`whatsapp-setup.md`](./whatsapp-setup.md) ·
[`TWILIO_SETUP.md`](./TWILIO_SETUP.md)
