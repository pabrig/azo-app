/** Mantener alineado con `package.json` → version y `CHANGELOG.md` */
export const APP_VERSION = "2.2.0";

/** Texto para el usuario final; una línea = un cambio visible. */
export const CURRENT_RELEASE_NOTES = [
  "Placa y Ranking por clase: elegís ILCA 6, ILCA 7, Optimist, etc. (ya no «Todas»).",
  "Solo ves fechas y regatas con resultados cargados por la comisión; nada de DNC «fantasma» antes de la regata.",
  "Descartes: en fechas de 3 regatas, 1 descarte por defecto; en la tabla se marca (desc.).",
  "Carga: opción Descalificado (DSQ) y misma leyenda que en la placa.",
  "Clases unificadas ILCA 6 / ILCA 7 (compatible con datos viejos «Laser radial/std»).",
  "Interfaz renovada: filtros de clase, tablas más claras y navegación en desktop.",
  "Inscripción: no podés anotarte en fechas pasadas; podés ver inscriptos y documentos.",
  "Ranking y placa se consultan en la app; si hace falta, hay un enlace discreto para descargar PDF.",
] as const;
