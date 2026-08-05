# Plantilla de importación para Airtable

Estos 8 CSV crean las tablas de Carlog con los nombres de campo correctos.
Cada uno trae una fila de ejemplo (con datos ficticios) para que Airtable
infiera bien el tipo de cada columna — bórrala en cuanto termines de
configurar los tipos.

**Si ya tienes la base creada** (tablas 1-7) y solo te falta el login
propio: importa únicamente `8-LoginCodes.csv` como tabla nueva llamada
`LoginCodes`, y salta directo a sus ajustes manuales más abajo.

**Importa en este orden** (1 a 8), porque las tablas 2-5 enlazan con
Vehiculos:

1. En Airtable: **Add or import → CSV file** → sube `1-Vehiculos.csv` →
   marca "First row is field names" → importa como tabla nueva llamada
   `Vehiculos`.
2. Repite para `2-Averias.csv`, `3-Mantenimientos.csv`, `4-Repuestos.csv`,
   `5-ITV.csv`, `6-PushSubscriptions.csv`, `7-AlertasEnviadas.csv` y
   `8-LoginCodes.csv`, cada uno como tabla nueva con el nombre sin el
   número (`Averias`, `Mantenimientos`, `Repuestos`, `ITV`,
   `PushSubscriptions`, `AlertasEnviadas`, `LoginCodes`).

## Ajustes manuales tras importar (Airtable no los infiere del CSV)

- **Campo `Vehiculo`** en Averias/Mantenimientos/Repuestos/ITV: Airtable lo
  importa como texto. Haz clic en el encabezado → **Edit field** → cambia
  el tipo a **Link to another record** → tabla `Vehiculos`. Luego, en cada
  fila, sustituye el texto de matrícula por el enlace real al vehículo
  correspondiente (con pocos vehículos es cuestión de segundos).
- **Campos Single select** — conviértelos y añade las opciones exactas:
  - `Vehiculos.Tipo`: `Turismo`, `Moto`, `Furgoneta`
  - `Averias.Estado`: `Pendiente`, `Resuelta`
  - `Repuestos.Tipo_Repuesto`: `Neumáticos`, `Batería`, `Frenos`, `Correa de distribución`, `Filtros`, `Otro`
  - `ITV.Resultado`: `Favorable`, `Desfavorable`, `Negativo`
  - `AlertasEnviadas.Tipo`: `Mantenimiento`, `Repuesto`, `ITV`
- **Campos Date**: revisa que `Fecha`, `Fecha_Realizada`, `Fecha_Proxima`,
  `Km_Actual_Fecha` y `Fecha_Enviada` queden como tipo **Date** (Airtable
  suele detectarlo solo al ver `2026-08-05`, pero conviene confirmarlo).
- **Campos Number**: `Año`, `Km`, `Km_Actual`, `Precio`, `Intervalo_Km`,
  `Intervalo_Meses`, `Vida_Util_Km`, `Vida_Util_Años` — confirma que sean
  **Number** (Precio con formato decimal, 2 dígitos).
- **Tabla `LoginCodes`** (usada por el login propio):
  - `ExpiresAt` → tipo **Date**, con la opción "Include a time field"
    activada (necesitamos hora, no solo fecha).
  - `Used` → tipo **Checkbox**.
  - `Attempts` → tipo **Number** (entero, sin decimales).
  - Esta tabla la rellena y limpia la propia app — no hace falta que metas
    datos de ejemplo, la fila vacía del CSV es suficiente para crear las
    columnas.
- Borra la fila de ejemplo de cada tabla una vez revisados los tipos.

Cuando termines, coge el **Base ID** (en la URL de la base, `app...`) y crea
un **Personal Access Token** en
[airtable.com/create/tokens](https://airtable.com/create/tokens) con scopes
`data.records:read` y `data.records:write` sobre esta base — son tu
`AIRTABLE_BASE_ID` y `AIRTABLE_API_KEY`.
