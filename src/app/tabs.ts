import type { TabId } from "../domain/types";

export const APP_TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  /** Barra inferior móvil: dos líneas legibles. */
  mobileLines?: [string, string];
}[] = [
  { id: "inscripcion", label: "Inscripción", shortLabel: "Insc." },
  { id: "fechas", label: "Fechas", shortLabel: "Fechas" },
  { id: "carga", label: "Carga", shortLabel: "Carga" },
  {
    id: "placa",
    label: "Clasificación Fecha",
    shortLabel: "Cl. fecha",
    mobileLines: ["Clasificación", "Fecha"]
  },
  {
    id: "ranking",
    label: "Clasificación Final",
    shortLabel: "Cl. final",
    mobileLines: ["Clasificación", "Final"]
  }
];
