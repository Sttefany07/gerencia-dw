# Gestión tabular de proyectos, horas, tarifas, costos y facturación

Aplicación web funcional en **React + Vite + TypeScript + Tailwind CSS + SheetJS/xlsx** para convertir un Excel de gestión de proyectos en una plataforma tabular ejecutiva.

## Funcionalidades incluidas

- Carga de archivo Excel.
- Historial de cargas con fecha, hora, descripción, registros y estado.
- Última carga activa automática.
- Persistencia local con `localStorage`.
- Reactivación y eliminación de cargas históricas.
- Normalización de columnas equivalentes.
- Limpieza de textos, horas y fechas.
- Alertas por columnas faltantes, datos no numéricos, hitos vacíos, tarifas faltantes y filtros sin datos.
- Administración editable de tarifas internas de operaciones.
- Administración editable de tarifas comerciales por país, cliente, proyecto y rol.
- Filtros encadenados: País → Cliente → Proyecto → Hito facturable → Fecha inicio/fin.
- Vista de Gerencia General con tablas comerciales y operativas.
- Vista de Gerencia de Servicios con tablas operativas.
- Búsqueda, ordenamiento, totales y descarga a Excel por tabla.
- Diseño responsive, limpio, sobrio y tabular.

## Instalación

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite, normalmente:

```bash
http://localhost:5173
```

## Estructura esperada del Excel

La app reconoce estas columnas o equivalentes:

- País
- Cliente
- Proyecto
- Hito facturable
- Rol estimado
- Rol asignado
- Persona
- Horas estimadas
- Horas registradas
- Horas facturables
- Fecha inicio
- Fecha fin

## Reglas principales

- Si `Hito facturable` está vacío, se reemplaza por `No aplica`.
- Si un texto importante está vacío, se reemplaza por `No definido`.
- Las horas se convierten a número decimal.
- Las fechas se intentan convertir a formato `YYYY-MM-DD`.
- La tarifa de operaciones calcula costos internos.
- La tarifa comercial calcula facturación.

## Fórmulas aplicadas

### Operaciones

- Costo estimado operaciones = Horas estimadas × Tarifa operaciones/hora.
- Costo ejecutado operaciones = Horas registradas × Tarifa operaciones/hora.
- Costo real operaciones = Horas registradas × Tarifa operaciones/hora.

### Comercial

- Facturación estimada comercial = Horas estimadas × Tarifa comercial/hora.
- Facturación registrada comercial = Horas registradas × Tarifa comercial/hora.
- Facturación real comercial = Horas facturables × Tarifa comercial/hora.
- Resultado operativo = Facturación real comercial - Costo real operaciones.

## Nota importante

La persistencia usa `localStorage`, por lo que los datos quedan guardados en el navegador donde se usa la app. Para un entorno multiusuario o empresarial real, se recomienda migrar la persistencia a backend con base de datos.

## Nota de compatibilidad ClickUp/exports con encabezados desplazados

Esta versión detecta automáticamente encabezados que no están en la primera fila. Por ejemplo, reconoce archivos exportados desde ClickUp donde las columnas empiezan después de filas vacías o de título.

Equivalencias agregadas:

- `País (drop down)` → País
- `Cliente (drop down)` → Cliente
- `Proyecto (drop down)` → Proyecto
- `Hitos facturable (drop down)` → Hito facturable
- `Rol (drop down)` → Rol asignado
- `Rol Estimado (drop down)` → Rol estimado
- `Time Estimate Rolled Up` → Horas estimadas
- `Time Logged Rolled Up` → Horas registradas
- `Horas facturables (number)` → Horas facturables
- `Due Date` → Fecha fin

Si el Excel no trae Fecha inicio, la aplicación usa Fecha fin/Due Date como fecha de referencia para que los filtros por rango funcionen.
