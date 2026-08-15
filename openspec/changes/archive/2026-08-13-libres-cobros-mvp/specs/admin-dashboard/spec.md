# Especificación: Dashboard Administrativo

## Propósito
Ofrecer a los administradores una vista centralizada del estado del club, con estadísticas, listados filtrables de socios, cuotas y pagos, y acceso a reportes.

## Modelo de datos
Ver modelos `Member`, `Fee`, `Payment`, `Commission`, `MonthlyClosing` y `SiteConfig` en las especificaciones correspondientes.

## Requisitos

### Requisito: Vista de estadísticas
El sistema DEBE mostrar tarjetas de resumen con métricas clave en la página inicial del panel.

#### Escenario: Carga del dashboard
- DADOS 200 socios, 150 cuotas pendientes y 50 pagos del mes
- CUANDO el administrador accede a `/admin`
- ENTONCES el sistema DEBE mostrar: total de socios, cuotas pendientes, cuotas vencidas, pagos del mes y comisiones del mes.

### Requisito: Listado de socios con filtros
El sistema DEBE permitir buscar y filtrar socios por nombre, DNI, categoría y estado.

#### Escenario: Filtro por categoría
- DADOS socios de categorías `ADULT`, `FAMILY` y `MINOR`
- CUANDO el administrador selecciona el filtro `FAMILY`
- ENTONCES el listado DEBE mostrar únicamente socios de esa categoría.

#### Escenario: Búsqueda por DNI
- DADO un socio con DNI `12345678`
- CUANDO el administrador ingresa `12345678` en el buscador
- ENTONCES el listado DEBE mostrar únicamente ese socio.

### Requisito: Listado de cuotas con estado
El sistema DEBE listar las cuotas con su estado, socio, período, monto y fecha de vencimiento.

#### Escenario: Filtro por estado
- DADAS cuotas en estados `PENDING`, `PAID` y `OVERDUE`
- CUANDO el administrador filtra por `OVERDUE`
- ENTONCES el listado DEBE mostrar solo las cuotas vencidas.

### Requisito: Historial de pagos
El sistema DEBE mostrar el historial de pagos con método, estado, monto, fecha y cuota asociada.

#### Escenario: Visualización de detalle
- DADO un pago por transferencia bancaria confirmado
- CUANDO el administrador abre el detalle
- ENTONCES el sistema DEBE mostrar la referencia del pago, fecha de confirmación y comisión generada.

### Requisito: Reporte de comisiones
El sistema DEBE mostrar un reporte de comisiones con opción de exportar a Excel.

#### Escenario: Exportación de comisiones
- DADO un reporte de comisiones filtrado por período
- CUANDO el administrador solicita exportar a Excel
- ENTONCES el sistema DEBE generar el archivo `.xlsx` con el detalle y los totales.

## Componentes UI
- `AdminSidebar`: navegación entre secciones.
- `StatsCards`: tarjetas de métricas principales.
- `MemberList`: tabla de socios con filtros y paginación.
- `FeeList`: tabla de cuotas con filtros por estado y período.
- `PaymentList`: historial de pagos con detalle.
- `CommissionReport`: visualización y exportación de comisiones.
- `MonthlyClosing`: pantalla de cierre mensual.

## Reglas de negocio
- Solo usuarios autenticados como administradores pueden acceder al dashboard.
- Los listados DEBEN soportar paginación para 200+ registros.
- Las métricas del dashboard DEBEN calcularse a partir de datos en tiempo real.

## Casos límite
- Dashboard sin datos: el sistema DEBE mostrar valores en cero y mensajes informativos.
- Listado con 200+ registros: la paginación DEBE mantenerse por debajo de 100 filas por página por defecto.
