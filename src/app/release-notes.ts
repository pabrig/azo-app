/** Mantener alineado con `package.json` → version y `CHANGELOG.md` */
export const APP_VERSION = "2.3.0";

/** Texto para el usuario final; una línea = un cambio visible. */
export const CURRENT_RELEASE_NOTES = [
  "Placa y Ranking por clase: elegís ILCA 6, ILCA 7, Optimist, etc. (ya no «Todas»).",
  "Solo ves fechas y regatas con resultados cargados por la comisión; nada de DNC «fantasma» antes de la regata.",
  "Fechas: la comisión elige cuántas regatas y cuántos descartes. Placa y ranking usan solo las que tienen resultado.",
  "Clima de la fecha: viento, ráfagas y temperatura según la hora de largada.",
  "Carga: penalizaciones con la sigla (DNC, DSQ, …) y la misma leyenda (desc.) que en la placa.",
  "Clases unificadas ILCA 6 / ILCA 7 (compatible con datos viejos «Laser radial/std»).",
  "Inscripción: no podés anotarte en fechas pasadas. La comisión puede corregir vela, clase, nombre, club, celular y DNI.",
  "Entre celulares no se pisan el WhatsApp del grupo ni los PDF de instrucciones (AR/IR).",
] as const;
