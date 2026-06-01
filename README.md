# Gestión tabular Excel - DW Consulware

Aplicación React + Vite para cargar un Excel de gestión de proyectos, calcular horas, costos, facturación y exportar tablas.

## Ejecutar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Persistencia en nube con Supabase

Si configuras Supabase, la carga activa, historial y tarifas quedan guardadas en la nube. Así se pueden abrir desde cualquier navegador, PC o link de producción.

### 1. Crear tabla

En Supabase, abre SQL Editor y ejecuta el archivo:

```text
SUPABASE_SETUP.sql
```

### 2. Crear variables de entorno

En local, crea un archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_SUPABASE_STATE_KEY=global
```

En Render, coloca esas mismas variables en:

```text
Environment → Environment Variables
```

### 3. Render

Usar Static Site:

```text
Root Directory: vacío
Build Command: npm run build
Publish Directory: dist
```

Si no configuras Supabase, la app seguirá guardando en localStorage del navegador.
