# CNA · Campeonato de Vela Ligera

PWA del Club Náutico Azopardo para inscripciones, fechas, AR/IR, resultados y ranking. El público es el grupo de amigos y familia del club: se instala en el celular desde el navegador.

La interfaz está en React y TypeScript. La lógica del campeonato (puntaje, fechas, clases, nube) vive en `src/domain` y `src/data`. Cada pantalla tiene un componente de lógica (`Inscripcion.tsx`, `Fechas.tsx`, …) y uno de apariencia (`*.view.tsx`).

## Desarrollo

```bash
npm install
npm run dev
```

`npm test` cubre el puntaje low point y las migraciones de datos viejos. `npm run build` genera `dist/` listo para publicar.

Los datos del celular siguen en `localStorage` con la clave `cna_vela_state_v2`, así que una actualización no borra inscriptos ya cargados.

## Persistencia: Appwrite Cloud (gratis)

En la consola nueva **no existe “collection”**: se llama **table**.

### Crear la tabla (estás en esta pantalla)

1. A la izquierda, botón **+ Create table** (arriba de “0 tables”).
2. Name: `championship`
3. Table ID: `championship` (Custom ID, no autogenerado)
4. Create.

### Columnas (dentro de la tabla → Columns → Create column)

Tipo **Long text** (o Medium text si no aparece Long):

| Key | Tipo | Required |
|---|---|---|
| `sailors` | Long text | no |
| `events` | Long text | no |
| `updatedAt` | String / varchar 40 | no |

### Permisos de la tabla (Settings → Permissions)

Marcá **Any** en Create, Read, Update y Delete. Es un club cerrado (amigos/familia): el PIN de comisión es un candado de UI, no autenticación real. Cualquiera con la URL puede leer y escribir el documento de Appwrite.

### Project ID

Los IDs del proyecto `azoapp` están como valor por defecto en `src/config.ts`. Para pisarlos en un build, copiá `.env.example` a `.env` y completá `VITE_APPWRITE_*` y `VITE_ADMIN_PIN`. En Vercel, las mismas variables van en Settings → Environment Variables.

### Plataforma web (origen)

**Overview / Settings → Platforms → Add platform → Web**, hostnames:

- `localhost`
- `127.0.0.1`
- `*.vercel.app` (previews + producción Hobby)
- el dominio custom de Vercel si más adelante hay uno

Sin el hostname de Vercel, el celular va a mostrar **Sin nube** / 403.

## Publicar (Vercel Hobby, costo cero)

1. En [vercel.com/pablo-rigallis-projects](https://vercel.com/pablo-rigallis-projects) → **Add New… → Project** → importar `pabrig/azo-app`.
2. Framework Preset: **Vite**. Build Command: `npm run build`. Output: `dist`.
3. Production Branch: `main` (cuando exista el merge). Hasta entonces podés apuntar producción a `chore/vercel-ci-security` o `feature/cna-vela-ligera`.
4. Cada PR genera un preview `*.vercel.app` (incluido). HTTPS lo pone Vercel.

La GitHub Action `CI` instala dependencias, corre los tests y el build, y busca secretos obvios; **no despliega**. El deploy lo hace el GitHub integration de Vercel (sin token extra).

## Contingencias mínimas

| Riesgo | Qué hay | Qué hacer si pasa |
|---|---|---|
| Sin señal / 5G flojo | LocalStorage + reintento al volver online | Un solo celular de CR carga puestos |
| Vercel caído | Sitio estático; los datos viven en Appwrite | Abrir un preview anterior |
| Appwrite caído | Badge “Sin señal”; sigue el celular | Exportar/capturar placa; no borrar localStorage |
| Escritura cruzada | Last-writer-wins en un solo documento | No editar comisión en dos teléfonos a la vez |
| PIN filtrado | Está en el bundle del cliente | Cambiar `VITE_ADMIN_PIN` (o el default de `src/config.ts`) y redeploy |

## Uso

| Pestaña | Quién | Qué |
|---|---|---|
| Inscripción | Timoneles | Clase, vela, nombre, club y fecha |
| Fechas | Todos / Comisión | Día, hora, avisos, AR e IR |
| Carga | Comisión (PIN) | Puestos y DNC / DNS / OCS / DNF / DSQ |
| Placa / Ranking | Todos | Captura PNG para WhatsApp |

Puntaje bajo (Low Point): protesta = inscriptos de la clase + 1. Descarte del peor resultado si una fecha tiene 4 o más regatas.

En el celular: abrí el sitio en Chrome o Safari → Compartir o menú → **Agregar a inicio**. Queda como app, sin tienda.
