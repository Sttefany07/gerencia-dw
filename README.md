# Gerencia DW Consulware - App nueva

App React + Vite para cargar Excel de ClickUp y visualizar:

- Gerencia de Servicios
- Gerencia General

Regla central de cálculo:

> Solo se contabilizan tareas finales con persona asignada. Las tareas padre/control y columnas Roll Up no se suman.

## Ejecutar local

```powershell
npm.cmd install
npm.cmd run dev
```

## Build

```powershell
npm.cmd run build
```

## Render

- Root Directory: vacío
- Build Command: `npm install --include=dev && npm run build`
- Publish Directory: `dist`

## Supabase

Ejecutar `SUPABASE_SETUP.sql` y configurar en Render:

```env
VITE_SUPABASE_URL=https://jylkmdldiehdxzgtpgxh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_TU_CLAVE_COMPLETA
VITE_SUPABASE_STATE_KEY=global
```
