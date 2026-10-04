import { useRef } from "react";
import { useChampionship } from "../../app/championship-context";
import { classNames, currentEvent, effectiveClassFilter, formatDay } from "../../domain/model";
import { rankedForFecha } from "../../domain/scoring";
import { ResultadosView } from "./Resultados.view";
import { shareCardPng } from "./share-png";

export function Placa() {
  const api = useChampionship();
  const cardRef = useRef<HTMLDivElement>(null);
  const event = currentEvent(api.state);
  const filter = effectiveClassFilter(api.state);
  const classLabel = event
    ? `${filter === "ALL" ? "Todas las clases" : filter} · ${formatDay(event.date)} ${event.time}`
    : filter === "ALL"
      ? "Todas las clases"
      : filter;
  const rows = event
    ? rankedForFecha(api.state, event.id).map((sailor, index) => ({
        id: sailor.id,
        position: index + 1,
        sailNumber: sailor.sailNumber,
        name: sailor.name,
        boatClass: sailor.boatClass,
        cells: Array.from({ length: event.racesCount }, (_, raceIndex) => {
          const value = sailor.raw[raceIndex];
          return value === null || value === undefined || value === "" ? "DNC" : String(value);
        }),
        net: sailor.net
      }))
    : [];

  async function onShare() {
    if (!cardRef.current) return;
    api.showToast("Generando captura…");
    const filename = `Placa_${event?.name || "fecha"}_CNA.png`;
    const result = await shareCardPng(cardRef.current, filename);
    if (result === "downloaded") api.showToast("Imagen descargada: adjuntála en WhatsApp");
  }

  return (
    <ResultadosView
      cardRef={cardRef}
      title={event ? `PLACA ${event.name.toUpperCase()}` : "SIN FECHAS"}
      classLabel={classLabel}
      year={String(new Date().getFullYear())}
      stamp={new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      columns={event ? Array.from({ length: event.racesCount }, (_, index) => `R${index + 1}`) : []}
      rows={rows}
      classNames={classNames(api.state)}
      classFilter={filter}
      onClassFilter={api.setClassFilter}
      onShare={onShare}
    />
  );
}
