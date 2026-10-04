# CNA · Campeonato de Vela Ligera

App móvil (HTML + JS, sin build) para inscripciones, fechas, AR/IR, resultados y ranking del Club Náutico Azopardo.

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

Marcá **Any** en Create, Read, Update y Delete.

### Project ID

En el menú **Overview** del proyecto `azoapp` copiá el Project ID y pegalo en `appwrite-config.js` (`CNA_APPWRITE_PROJECT_ID`). El Database ID `68e2a2b100201252c374` ya quedó cargado.

### Plataforma web

**Overview / Settings → Platforms → Add platform → Web**: `localhost`, `127.0.0.1` y después `TU_USUARIO.github.io`.

## Publicar (GitHub Pages)

`index.html` en la raíz. GitHub → Settings → Pages → branch `main` → `/ (root)`. Agregá el hostname `*.github.io` en Appwrite Platforms.

## Uso

| Pestaña | Quién | Qué |
|---|---|---|
| Inscripción | Timoneles | Clase, vela, nombre, club y fecha |
| Fechas | Todos / Comisión | Día, hora, avisos, AR e IR |
| Carga | Comisión (PIN) | Puestos y DNC / DNS / OCS / DNF / DSQ |
| Placa / Ranking | Todos | Captura PNG para WhatsApp |

Puntaje bajo (Low Point): protesta = inscriptos de la clase + 1. Descarte del peor resultado si una fecha tiene 4 o más regatas.
