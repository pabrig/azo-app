import { useRef } from "react";
import { useChampionship } from "../../app/championship-context";
import { classNames, effectiveClassFilter } from "../../domain/model";
import { rankedOverall } from "../../domain/scoring";
import { ResultadosView } from "./Resultados.view";
import { shareCardPng } from "./share-png";

export function Ranking() {
  const api = useChampionship();
  const cardRef = useRef<HTMLDivElement>(null);
  const filter = effectiveClassFilter(api.state);
  const rows = rankedOverall(api.state).map((sailor, index) => ({
    id: sailor.id,
    position: index + 1,
    sailNumber: sailor.sailNumber,
    name: sailor.name,
    boatClass: sailor.boatClass,
    cells: sailor.breakdown.map(String),
    net: sailor.net
  }));

  async function onShare() {
    if (!cardRef.current) return;
    api.showToast("Generando captura…");
    const result = await shareCardPng(cardRef.current, "Ranking_General_CNA.png");
    if (result === "downloaded") api.showToast("Imagen descargada: adjuntála en WhatsApp");
  }

  return (
    <ResultadosView
      cardRef={cardRef}
      title="RANKING GENERAL"
      classLabel={filter === "ALL" ? "Todas las clases" : filter}
      year={String(new Date().getFullYear())}
      stamp={new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      columns={api.state.events.map((event, index) => event.name.replace("Fecha ", "F") || `F${index + 1}`)}
      rows={rows}
      classNames={classNames(api.state)}
      classFilter={filter}
      onClassFilter={api.setClassFilter}
      onShare={onShare}
      note={
        <p className="text-[11px] text-slate-400 px-1">
          Suma de puntos netos de todas las fechas (menor puntaje gana). Descarte del peor resultado si una fecha tiene 4
          o más regatas. El campeonato prevé un descarte según el AR.
        </p>
      }
    />
  );
}
