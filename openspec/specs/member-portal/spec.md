# Especificación: Portal de Socios

## Propósito
Permitir a los socios consultar sus cuotas pendientes y realizar pagos ingresando únicamente su DNI, sin necesidad de contraseña.

## Modelo de datos
Ver modelos `Member`, `Fee` y `Payment` en las especificaciones correspondientes.

## Requisitos

### Requisito: Acceso por DNI
El sistema DEBE permitir a un socio ingresar a su cuenta introduciendo su DNI.

#### Escenario: Acceso exitoso
- DADO un socio con DNI `12345678` registrado en el sistema
- CUANDO ingresa su DNI en `/pagos`
- ENTONCES el sistema DEBE mostrar sus cuotas pendientes y el historial reciente.

#### Escenario: DNI no registrado
- DADO un DNI `99999999` que no existe en el sistema
- CUANDO un usuario intenta acceder
- ENTONCES el sistema DEBE mostrar un mensaje indicando que no se encontró el socio, sin revelar si el DNI existe.

### Requisito: Listado de cuotas
El sistema DEBE mostrar las cuotas del socio ordenadas por período, indicando estado, monto y vencimiento.

#### Escenario: Cuotas pendientes y vencidas
- DADO un socio con 2 cuotas pendientes y 1 vencida
- CUANDO accede al portal
- ENTONCES el sistema DEBE mostrar las 3 cuotas con sus estados y destacar la cuota vencida.

### Requisito: Inicio de pago
El sistema DEBE permitir seleccionar una cuota pendiente y elegir el método de pago.

#### Escenario: Selección de método
- DADO un socio con una cuota `PENDING`
- CUANDO selecciona la cuota y elige Stripe
- ENTONCES el sistema DEBE crear el pago y redirigir al checkout de Stripe.

#### Escenario: Cuota ya pagada
- DADO una cuota en estado `PAID`
- CUANDO el socio intenta seleccionarla para pagar
- ENTONCES el sistema DEBE deshabilitar la opción de pago y mostrarla como abonada.

### Requisito: Pantalla de confirmación
El sistema DEBE mostrar una pantalla de confirmación después de un pago exitoso.

#### Escenario: Pago exitoso
- DADO un pago confirmado por Stripe
- CUANDO el socio regresa al portal desde la pasarela
- ENTONCES el sistema DEBE mostrar el comprobante con monto, fecha y método de pago.

#### Escenario: Pago fallido
- DADO un pago rechazado por el proveedor
- CUANDO el socio regresa al portal
- ENTONCES el sistema DEBE informar el fallo y permitir reintentar con otro método.

## Componentes UI
- `PaymentPortal`: pantalla principal de ingreso por DNI y listado.
- `FeeCard`: tarjeta de cuota con estado, monto y botón de pago.
- `PaymentMethodSelector`: selector entre Stripe, MercadoPago y transferencia.
- `PaymentConfirmation`: pantalla de éxito o error del pago.

## Reglas de negocio
- No se requiere contraseña para acceder al portal.
- El DNI se maneja como identificador único pero no como credencial de alta seguridad.
- Solo se muestran cuotas del socio cuyo DNI se ingresó.
- El portal DEBE ser responsive y accesible desde dispositivos móviles.

## Casos límite
- Socio inactivo: el portal DEBE permitir el acceso y mostrar sus cuotas pendientes.
- Cuota vencida: el portal DEBE permitir el pago de cuotas `OVERDUE`.
- Acceso desde WhatsApp: el enlace con parámetro `?dni=...` DEBE prellenar el campo si el DNI existe.
