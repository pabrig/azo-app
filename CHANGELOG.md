# Changelog

Cambios notables de la app del campeonato CNA. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [2.2.0] - 2026-10-05

### Añadido

- Normalización de clases **ILCA 6 / ILCA 7** (alias Laser radial / Laser std) al cargar y sincronizar.
- Scripts `npm run migrate:pull` / `migrate:push` para revisar y aplicar migraciones en Appwrite.
- Opción **Descalificado** en carga de resultados (código **DSQ**); no se descarta del neto.
- Leyenda unificada **`(desc.)`** en placa, ranking y vista previa de carga para regatas descartadas.
- Chips de clase con logos (Optimist, ILCA 6, ILCA 7) y navegación desktop mejorada.
- Diálogo de **novedades** al tocar la versión en el encabezado.
- Bloqueo de inscripción de competidores en fechas ya disputadas (la comisión sigue pudiendo gestionar).

### Cambiado

- **Placa** y **Ranking** siempre por clase (sin filtro «Todas»).
- Fechas y regatas **sin carga de la comisión** no suman puntos ni aparecen en tablas públicas.
- Solo se muestran columnas de regatas con al menos un resultado cargado.
- Descarte por defecto: **1** cuando hay 3 o más regatas en la fecha (alineado a placa oficial).
- Penalizaciones y vacíos en regata publicada: **flota + 1** (p. ej. DNC); desempates RRS A8 en ranking/placa.
- Pantallas de resultados, carga, fechas e inscripción: layout más compacto y legible en móvil y desktop.

### Corregido

- Sincronización: normalizar clases en memoria ya no pisa `classesAt` de la comisión sin cambios reales.
- Neto por fecha: timoneles no inscriptos en esa fecha no arrastran puntos ajenos.
- Compilación CSS (`font-variant-numeric`) en estilos de leyenda de descarte.

## [2.1.0] - 2025

- Fechas del campeonato sincronizadas entre dispositivos.
- Clases con categorías Masculino, Femenino y General.
- Exportar Placa y Ranking a PNG para WhatsApp.
- Inscripciones por nombre y apellido (misma persona aunque cambie vela o club).
