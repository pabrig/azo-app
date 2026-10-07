import { useChampionship } from "../../app/championship-context";
import { classNames, currentEvent, formatDay, resultsClassFilter } from "../../domain/model";
import {
  fechaResultsStarted,
  placaCellText,
  placaColumns,
  raceIndexesWithResults,
  rankedForFecha
} from "../../domain/scoring";
import { ResultadosView } from "./Resultados.view";

export function Placa() {
  const api = useChampionship();
  const event = currentEvent(api.state);
  const filter = resultsClassFilter(api.state);
  const scope = { ...api.state, classFilter: filter };
  const classLabel = event ? `${filter} · ${formatDay(event.date)} ${event.time}` : filter;
  const activeRaceIndexes = event ? raceIndexesWithResults(event) : [];
  const started = Boolean(event && fechaResultsStarted(event));
  const rows =
    started && event
      ? rankedForFecha(scope, event.id).map((sailor, index) => ({
          id: sailor.id,
          position: index + 1,
          sailNumber: sailor.sailNumber,
          name: sailor.name,
          boatClass: sailor.boatClass,
          cells: activeRaceIndexes.map((raceIndex) => placaCellText(sailor, raceIndex)),
          net: sailor.net
        }))
      : [];

  return (
    <ResultadosView
      title={event ? `PLACA ${event.name.toUpperCase()}` : "SIN FECHAS"}
      classLabel={classLabel}
      year={String(new Date().getFullYear())}
      stamp={new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      columns={started && event ? placaColumns(event) : []}
      note={
        event && !started ? (
          <p className="text-slate-500">
            Todavía no hay resultados para esta fecha. Aparecerán cuando la comisión empiece la carga en la pestaña Carga.
          </p>
        ) : undefined
      }
      rows={rows}
      classNames={classNames(api.state)}
      classFilter={filter}
      onClassFilter={api.setClassFilter}
      pdfFilename={`Placa_${(event?.name || "fecha").replace(/\s+/g, "_")}_CNA.pdf`}
    />
  );
}
