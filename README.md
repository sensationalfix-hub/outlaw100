# OUTLAW100

Companion completista de **Red Dead Redemption 2** construido como aplicación independiente de ChatGPT Sites.

La release de referencia es **desktop-first**. La arquitectura ya permite adaptar móvil después sin cambiar el modelo canónico ni el progreso.

## Stack

- Next.js 15 + React 19 + TypeScript
- Supabase Postgres + Auth + Row Level Security
- Leaflet / React Leaflet para el mapa
- Vercel para producción
- Catálogo reproducible a partir de las cuatro fuentes originales

## Fuentes maestras

`data/source/` contiene las copias reproducibles de las fuentes entregadas para la migración:

- `rdr2-completion.xlsx`: catálogo y criterios específicos, 15 hojas.
- `rdr2-complete-checklist.pdf`: hoja de ruta y ventanas editoriales, 51 páginas.
- `outlaw100-legacy.html`: experiencia visual, Archivo, traducciones, relaciones, medios, mapas y metadatos.
- `chinese-rocks.otf`: tipografía identitaria local. Se mantiene fuera del repositorio y debe aportarse al entorno de despliegue autorizado.

La jerarquía de verdad es **Excel → catálogo**, **PDF → ruta**, **HTML → experiencia/medios/metadatos**. El progreso legado del HTML no se importa como catálogo.

## Modelo canónico

Supabase usa tablas compartidas de solo lectura para catálogo y tablas privadas por usuario para estado:

- `profiles`
- `entities`
- `criteria`
- `relations`
- `milestones`
- `milestone_tasks`
- `progress`
- `inventory`
- `craft_recipes`
- `craft_requirements`
- `source_references`
- `map_markers`
- `media_assets`
- `audit_records`
- `archive_entries`

Un animal, arma, planta, objeto o coleccionable tiene **un único ID estable**. Dashboard, Ruta, Archivo, mapa y crafteo apuntan al mismo criterio de progreso.

## Variables de entorno

Copia `.env.example` como `.env.local` para desarrollo. En Vercel configura las mismas variables para Production y Preview:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

No uses ni publiques `service_role` en el frontend.

## Reconstrucción de datos

```bash
npm run import:xlsx
npm run import:pdf
npm run import:html
npm run build:catalog
npm run audit:data
npm run seed:sql
```

El resultado canónico se genera en `data/generated/catalog.json` y se copia a `public/data/catalog.json` como respaldo local/offline. Producción intenta leer primero las tablas canónicas de Supabase; si todavía están vacías o la red falla, usa esa copia estática con los mismos IDs.

## Supabase

Las migraciones versionadas viven en `supabase/migrations/`.

El proyecto configura:

- email/password y magic link mediante Supabase Auth;
- RLS para `profiles`, `progress` e `inventory` usando `auth.uid()`;
- catálogo compartido de solo lectura;
- RPC `SECURITY INVOKER` para cambios de progreso;
- índices de las claves usadas por progreso/RLS;
- trigger de perfil al crear usuario;
- importador server-only de catálogo.

`supabase/seed.sql` es una semilla completa reproducible. El importador remoto permite cargar el mismo catálogo desde la URL desplegada de `public/data/catalog.json` sin exponer credenciales administrativas al navegador.

## Verificación

```bash
npm test
python3 -m unittest discover -s tests/python -p 'test_*.py'
npm run audit:data
npm run lint
npm run build
npm run test:e2e
```

La auditoría de datos comprueba, entre otras cosas:

- 15/15 hojas del Excel;
- 51/51 páginas del PDF leídas;
- páginas de contenido 2–51 estructuradas, salvo la página 27 que es únicamente el separador `COMPENDIUM`;
- Colter y American Venom presentes;
- IDs duplicados;
- criterios, relaciones y tareas huérfanas;
- recetas/materiales inválidos;
- tareas sin fuente;
- referencias de procedencia inválidas;
- fuentes de Red Dead Online excluidas.

## Mapa

El mapa conserva la fuente del HTML legado para los marcadores completos de RDR2 y usa el catálogo canónico para resolver entidades/checks. Los 14 marcadores del seed son un respaldo estructurado; en navegador se carga el dataset completo del mapa y se filtra contenido de Red Dead Online.

## Progreso

El progreso del usuario vive en Supabase y usa un respaldo local por `user_id` para recuperación de UI. También puede exportarse/importarse como JSON.

Tener materiales suficientes **no marca un objeto como fabricado**. Inventario y criterio de fabricación son estados distintos.

## Despliegue

La producción objetivo es:

1. repositorio GitHub como fuente de código;
2. proyecto Vercel enlazado al repositorio;
3. variables públicas de Supabase configuradas en Vercel;
4. `npm run build` verde;
5. catálogo cargado en Supabase;
6. despliegues posteriores disparados por GitHub.

No hace falta volver a ChatGPT Sites para mantener OUTLAW100: cualquier entorno capaz de trabajar con el repositorio puede continuar el proyecto.
