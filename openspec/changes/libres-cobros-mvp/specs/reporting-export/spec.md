# Especificación: Reportes y Exportación

## Propósito
Generar reportes administrativos de deudas, pagos y comisiones, con exportación a Excel (.xlsx) como formato principal del MVP.

## Modelo de datos
Ver modelos `Member`, `Fee`, `Payment`, `Commission` y `MonthlyClosing` en las especificaciones correspondientes.

## Requisitos

### Requisito: Reporte de deudas
El sistema DEBE generar un reporte de socios con cuotas pendientes o vencidas, mostrando monto total adeudado.

#### Escenario: Deudas por período
- DADOS 50 socios con cuotas `PENDING` o `OVERDUE` en septiembre de 2026
- CUANDO el administrador solicita el reporte de deudas filtrado por ese período
- ENTONCES el sistema DEBE listar cada socio, cantidad de cuotas adeudadas y monto total.

#### Escenario: Deuda cero
- DADOS todos los socios al día con sus cuotas pagas
- CUANDO el administrador solicita el reporte de deudas
- ENTONCES el sistema DEBE mostrar un listado vacío o un mensaje indicando que no hay deudas.

### Requisito: Historial de pagos
El sistema DEBE generar un reporte de pagos confirmados filtrable por fecha, método de pago y socio.

#### Escenario: Filtro por método
- DADOS pagos con métodos `stripe`, `mercadopago` y `bank_transfer`
- CUANDO el administrador filtra por `bank_transfer`
- ENTONCES el reporte DEBE mostrar solo los pagos por transferencia bancaria.

### Requisito: Reporte de comisiones
El sistema DEBE generar un reporte de comisiones generadas, agrupadas por período y método de pago.

#### Escenario: Comisiones por cierre mensual
- DADO un cierre mensual cerrado con 30 comisiones
- CUANDO el administrador solicita el reporte
- ENTONCES el sistema DEBE mostrar el total de comisiones, la tasa aplicada y el detalle por pago.

### Requisito: Exportación a Excel
El sistema DEBE permitir exportar cualquier reporte a formato Excel (.xlsx).

#### Escenario: Exportación de deudas
- DADO un reporte de deudas filtrado
- CUANDO el administrador solicita exportar a Excel
- ENTONCES el sistema DEBE generar un archivo `.xlsx` con encabezados, datos y totales.

#### Escenario: Exportación vacía
- DADO un reporte sin resultados
- CUANDO el administrador solicita exportar
- ENTONCES el sistema DEBE generar un archivo Excel con encabezados y sin filas de datos.

## Formatos de exportación
- Excel (.xlsx): formato principal y obligatorio en el MVP.
- PDF: opcional fuera del alcance del MVP, a implementar en fases posteriores.

## Componentes UI
- `ExportButton`: botón contextual para exportar el reporte actual.
- `ReportFilter`: controles de filtro por período, estado, categoría y método.
- `ReportTable`: tabla de resultados con totales y paginación.

## Reglas de negocio
- Los reportes DEBEN respetar los filtros activos en la interfaz al momento de exportar.
- El nombre del archivo DEBE incluir el tipo de reporte y la fecha de generación.
- Los montos DEBEN exportarse como números para permitir cálculos en Excel.

## Casos límite
- Reporte con más de 1000 filas: el sistema DEBE generar el Excel correctamente sin bloquear la interfaz.
- Filtro de fecha inválida: el sistema DEBE validar el rango y mostrar un error claro.
- Decimales en montos: el sistema DEBE exportar valores con dos decimales.
