import type { TabId } from "../domain/types";

export const APP_TABS: { id: TabId; label: string; shortLabel: string }[] = [
  { id: "inscripcion", label: "Inscripción", shortLabel: "Insc." },
  { id: "fechas", label: "Fechas", shortLabel: "Fechas" },
  { id: "carga", label: "Carga", shortLabel: "Carga" },
  { id: "placa", label: "Placa", shortLabel: "Placa" },
  { id: "ranking", label: "Ranking", shortLabel: "Ranking" }
];
