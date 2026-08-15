# Especificación: Registro de Socios

## Propósito
Gestionar el catálogo de socios del club, sus categorías y estados, permitiendo altas, bajas, modificaciones, importación masiva y exportación de datos.

## Modelo de datos

```prisma
model Member {
  id        String   @id @default(cuid())
  dni       String   @unique
  firstName String
  lastName  String
  email     String?  @unique
  phone     String?
  category  String   @default("ADULT") // ADULT, FAMILY, MINOR
  status    String   @default("ACTIVE") // ACTIVE, INACTIVE
  joinDate  DateTime @default(now())
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  fees      Fee[]
  payments  Payment[]
  whatsappLogs WhatsAppLog[]
  @@index([dni])
  @@index([status])
  @@index([category])
}
```

## Requisitos

### Requisito: Unicidad del DNI
El sistema DEBE garantizar que cada socio tenga un DNI único y no reutilizable.

#### Escenario: Alta con DNI duplicado
- DADO un socio existente con DNI `12345678`
- CUANDO un administrador intenta crear otro socio con el mismo DNI
- ENTONCES el sistema DEBE rechazar la operación y devolver un error 409 indicando que el DNI ya existe.

### Requisito: ABM de socios
El sistema DEBE permitir crear, leer, actualizar y eliminar socios desde la interfaz administrativa.

#### Escenario: Creación exitosa
- DADO un formulario de socio completo con DNI, nombre, apellido, categoría y teléfono
- CUANDO el administrador confirma el alta
- ENTONCES el sistema DEBE persistir el socio con estado `ACTIVE` y mostrarlo en el listado.

#### Escenario: Eliminación lógica no permitida
- DADO un socio con pagos o cuotas asociadas
- CUANDO el administrador intenta eliminarlo
- ENTONCES el sistema DEBE rechazar la eliminación física y ofrecer cambiar su estado a `INACTIVE`.

### Requisito: Gestión de categorías
El sistema DEBE permitir definir categorías de socio (ej. ADULT, FAMILY, MINOR) y asociar cada socio a una única categoría.

#### Escenario: Cambio de categoría
- DADO un socio con categoría `MINOR`
- CUANDO el administrador actualiza su categoría a `ADULT`
- ENTONCES el sistema DEBE persistir el cambio y aplicar el monto de cuota correspondiente a las nuevas generaciones mensuales.

### Requisito: Importación masiva
El sistema DEBE soportar la importación de socios desde un archivo Excel (.xlsx) con columnas estandarizadas.

#### Escenario: Importación válida
- DADO un archivo Excel con 50 filas de socios nuevos y sin DNIs duplicados
- CUANDO el administrador carga el archivo
- ENTONCES el sistema DEBE crear los socios, reportar el total importado y mostrar un resumen de errores si los hubiera.

#### Escenario: Importación con filas inválidas
- DADO un archivo Excel con 10 filas, de las cuales 2 tienen DNI vacío
- CUANDO el administrador carga el archivo
- ENTONCES el sistema DEBE crear las 8 filas válidas, omitir las 2 inválidas y devolver un informe detallado por fila.

### Requisito: Exportación de socios
El sistema DEBE permitir exportar el listado de socios a Excel (.xlsx), respetando los filtros aplicados en la interfaz.

#### Escenario: Exportación filtrada
- DADO un listado de socios filtrado por categoría `FAMILY`
- CUANDO el administrador solicita la exportación
- ENTONCES el sistema DEBE generar un archivo Excel que contenga únicamente los socios filtrados.

## Reglas de negocio
- El DNI es obligatorio, numérico y único.
- El estado `INACTIVE` conserva el historial de cuotas y pagos del socio.
- No se permite la eliminación física de socios con registros asociados.
- La categoría determina el monto de cuota a través de `FeeConfig`.

## Casos límite
- DNI con leading zeros: el sistema DEBE tratar el DNI como cadena para preservar ceros iniciales.
- Socio inactivo con cuotas pendientes: las cuotas siguen vigentes y pueden ser pagadas.
- Archivo Excel con formato no esperado: el sistema DEBE devolver error claro sin crear registros parciales.
