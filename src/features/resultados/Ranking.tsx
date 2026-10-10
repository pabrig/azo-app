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
      title="Clasificación Final"
      titleLine1="Clasificación"
      titleLine2="Final"
      classLabel={filter}
      year={String(new Date().getFullYear())}
      stamp={new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
      columns={resultFechas.map((event, index) => event.name.replace("Fecha ", "F") || `F${index + 1}`)}
      rows={rows}
      classNames={classNames(api.state)}
      classFilter={filter}
      onClassFilter={api.setClassFilter}
      legendScope="final"
      pdfFilename="Clasificacion_Final_CNA.pdf"
      note={
        <p>
          {resultFechas.length
            ? "Menor total gana. Cada columna es el neto de esa fecha. Quienes se inscriben después reciben DNC en fechas ya corridas; las fechas futuras sin carga muestran 0 hasta publicarse."
            : "Todavía no hay fechas con resultados cargados. La clasificación final se publicará cuando la comisión empiece la carga."}
        </p>
      }
    />
  );
}
