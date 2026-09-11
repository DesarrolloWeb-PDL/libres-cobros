# Checklist: Walkthrough Manual Multi-Institución

Este checklist verifica que el sistema multi-tenant funcione correctamente. Completar cada paso antes de marcar como finalizado.

## Pre-requisitos

- [ ] Base de datos con al menos 2 instituciones activas
- [ ] Usuarios admin configurados para cada institución
- [ ] Socios y cuotas en cada institución
- [ ] Credenciales de Super Admin disponibles

---

## 1. Login y Roles

### Super Admin
- [ ] Login exitoso con credenciales de super admin
- [ ] Acceso a /admin/instituciones (gestión de instituciones)
- [ ] Acceso a /admin/usuarios (gestión de usuarios)
- [ ] Acceso a /admin/configuracion (configuración global)
- [ ] Selector de institución visible en el sidebar

### Admin de Institución
- [ ] Login exitoso con credenciales de admin de la institución
- [ ] Acceso a /admin (panel principal)
- [ ] Acceso a /admin/socios (gestión de socios)
- [ ] Acceso a /admin/cuotas (gestión de cuotas)
- [ ] Acceso a /admin/pagos (gestión de pagos)
- [ ] Acceso a /admin/configuracion (configuración de la institución)
- [ ] NO acceso a /admin/instituciones (solo super admin)
- [ ] NO acceso a /admin/usuarios (solo super admin)

---

## 2. Aislamiento de Datos

### Institución A vs Institución B
- [ ] Admin de la institución A solo ve socios de la institución A
- [ ] Admin de la institución A solo ve cuotas de la institución A
- - [ ] Admin de la institución A solo ve pagos de la institución A
- [ ] Admin de la institución A NO ve datos de la institución B
- [ ] Intento de acceso directo a datos de la institución B devuelve error 403/404

### Super Admin
- [ ] Puede ver datos de todas las instituciones
- [ ] Selector de institución filtra datos correctamente
- [ ] Cambio de institución actualiza la vista

---

## 3. Portal de Socios

### Acceso por Institución
- [ ] /pagos/instituciones muestra lista de instituciones activas
- [ ] Click en institución redirige a /pagos/[slug]
- [ ] Institución inactiva muestra error 404
- [ ] Institución inexistente muestra error 404

### Búsqueda por DNI
- [ ] Búsqueda de DNI retorna socios de la institución correcta
- [ ] DNI de otra institución no retorna resultados
- [ ] DNI inexistente muestra mensaje de error
- [ ] DNI con parámetro ?dni= prellena el campo

### Pago
- [ ] Socio puede ver cuotas pendientes
- [ ] Socio puede iniciar proceso de pago
- [ ] Confirmación de pago muestra datos de la institución
- [ ] Recibo de pago incluye información de la institución

---

## 4. Funcionalidad por Institución

### Gestión de Socios
- [ ] Crear socio en institución A
- [ ] Editar socio en institución A
- [ ] Socio creado en institución A NO aparece en institución B
- [ ] Buscar socio por DNI en institución A

### Gestión de Cuotas
- [ ] Generar cuotas mensuales para institución A
- [ ] Cuotas generadas tienen institutionId correcto
- [ ] Marcar cuota como pagada
- [ ] Cuotas vencidas se marcan automáticamente

### Gestión de Pagos
- [ ] Registrar pago para socio de la institución A
- [ ] Pago tiene institutionId correcto
- [ ] Confirmar pago
- [ ] Pago confirmado actualiza estado de cuota

### Comisiones
- [ ] Calcular comisión para institución A
- [ ] Comisión tiene institutionId correcto
- [ ] Comisión aparece en reportes de la institución A

---

## 5. Configuración por Institución

### Datos Bancarios
- [ ] Configurar datos bancarios para institución A
- [ ] Datos bancarios de la institución A aparecen en portal de socios
- [ ] Datos bancarios de la institución A NO aparecen en institución B

### Mensajería
- [ ] Configurar WhatsApp para institución A
- [ ] Configurar Twilio para institución B
- [ ] Envío de SMS usa credenciales de la institución correcta

### Apariencia
- [ ] Configurar colores para institución A
- [ ] Colores de la institución A aparecen en el admin
- [ ] Colores de la institución A NO aparecen en institución B
- [ ] Subir logo para institución A
- [ ] Logo de la institución A aparece en portal de socios

---

## 6. API y Endpoints

### Endpoints Protegidos
- [ ] GET /api/admin/institutions - solo super admin
- [ ] POST /api/admin/institutions - solo super admin
- [ ] GET /api/admin/site-config - admin de la institución
- [ ] PUT /api/admin/site-config - admin de la institución
- [ ] GET /api/admin/members - admin de la institución (filtrado)
- [ ] POST /api/admin/fees/generate - admin de la institución

### Endpoints Públicos
- [ ] GET /api/member/fees?institution=slug&dni=123 - público
- [ ] POST /api/checkout - público
- [ ] POST /api/webhooks/stripe - público
- [ ] POST /api/webhooks/mercadopago - público

---

## 7. Casos Borde

### Datos Inexistentes
- [ ] Institución inexistente muestra error 404
- [ ] Socio inexistente muestra error 404
- [ ] Cuota inexistente muestra error 404

### Permisos
- [ ] Usuario sin rol no puede acceder al admin
- [ ] Admin de institución A no puede acceder a datos de institución B
- [ ] Super admin puede acceder a todo

### Concurrencia
- [ ] Dos admins de diferentes instituciones pueden trabajar simultáneamente
- [ ] Cambios en una institución no afectan a otra institución

---

## 8. SMS y Notificaciones

### Configuración
- [ ] Configurar WhatsApp para institución A
- [ ] Configurar Twilio para institución B
- [ ] Verificar que el canal correcto se detecta

### Envío
- [ ] Enviar recordatorio individual
- [ ] Enviar recordatorio masivo
- [ ] Verificar que el SMS/WhatsApp llega
- [ ] Revisar logs en la base de datos

---

## 9. Build y Deploy

### Build
- [ ] `npm run build` sin errores
- [ ] `npm run lint` sin errores
- [ ] `npx tsc --noEmit` sin errores

### Deploy
- [ ] Deploy a Vercel exitoso
- [ ] Variables de entorno configuradas
- [ ] Migraciones de Prisma aplicadas
- [ ] Aplicación funciona en producción

---

## 10. Documentación

- [ ] README actualizado con instrucciones de setup
- [ ] Documentación de Twilio configurada
- [ ] Guía de troubleshooting disponible
- [ ] Ejemplos de uso documentados

---

## Firmas

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Super Admin | | | |
| Admin Institución A | | | |
| Admin Institución B | | | |
| QA | | | |

---

## Notas

- Completar este checklist antes de marcar el change como "archived"
- Cualquier prueba fallida debe ser documentada y resuelta
- Adjuntar evidencias (screenshots, logs) cuando sea necesario
- Revisar con el equipo antes de finalizar
