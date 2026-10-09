import { useChampionship } from "../../app/championship-context";
import { classNames, resultsClassFilter } from "../../domain/model";
import { fechasWithResults, rankedOverall } from "../../domain/scoring";
import { ResultadosView } from "./Resultados.view";

export function Ranking() {
  const api = useChampionship();
  const filter = resultsClassFilter(api.state);
  const scope = { ...api.state, classFilter: filter };
  const resultFechas = fechasWithResults(scope);
  const rows = resultFechas.length
    ? rankedOverall(scope).map((sailor, index) => ({
        id: sailor.id,
        position: index + 1,
        sailNumber: sailor.sailNumber,
        name: sailor.name,
        boatClass: sailor.boatClass,
        cells: sailor.breakdown.map(String),
        net: sailor.net
      }))
    : [];

  return (
    <ResultadosView
      title="RANKING GENERAL"
      classLabel={filter}
      year={String(new Date().getFullYear())}
      stamp={new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      columns={resultFechas.map((event, index) => event.name.replace("Fecha ", "F") || `F${index + 1}`)}
      rows={rows}
      classNames={classNames(api.state)}
      classFilter={filter}
      onClassFilter={api.setClassFilter}
      pdfFilename="Ranking_General_CNA.pdf"
      note={
        <p className="text-slate-500">
          {resultFechas.length
            ? "Suma de puntos netos por fecha con resultados cargados (menor puntaje gana). Cada fecha usa solo las regatas publicadas en placa y los descartes definidos en Fechas. Las columnas vacías no suman."
            : "Todavía no hay fechas con resultados cargados. El ranking se publicará cuando la comisión empiece la carga."}
        </p>
      }
    />
  );
}
