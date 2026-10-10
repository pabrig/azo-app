import { ScoreCellLegend } from "./ScoreCellLegend";

export function ResultsScoringLegend({ scope }: { scope: "fecha" | "final" }) {
  return (
    <section className="results-scoring-legend" aria-label="Leyenda de puntuación">
      <h3 className="results-scoring-legend__title">Cómo leer la tabla</h3>
      <ul className="results-scoring-legend__list">
        <li className="results-scoring-legend__item">
          <span className="results-scoring-legend__sample tabular-nums">1, 2, 3…</span>
          <span className="results-scoring-legend__text">Puesto en la regata (menor puntaje gana)</span>
        </li>
        <li className="results-scoring-legend__item">
          <span className="results-scoring-legend__sample">DNC, DNS, DNF…</span>
          <span className="results-scoring-legend__text">Penalización según flota de la fecha</span>
        </li>
        <li className="results-scoring-legend__item">
          <span className="results-scoring-legend__sample results-scoring-legend__sample--cell">
            <ScoreCellLegend text="8 (desc.)" />
          </span>
          <span className="results-scoring-legend__text">
            <strong className="font-semibold text-slate-300">desc.</strong> = peor regata descartada en el neto de esa
            fecha
          </span>
        </li>
        <li className="results-scoring-legend__item">
          <span className="results-scoring-legend__sample results-scoring-legend__sample--net">Netos</span>
          <span className="results-scoring-legend__text">
            {scope === "fecha"
              ? "Total de la fecha con descartes configurados en Fechas"
              : "Suma de los netos de cada fecha publicada (columna por fecha del campeonato)"}
          </span>
        </li>
      </ul>
      {scope === "final" ? (
        <div className="results-scoring-legend__footnote">
          <p>
            Inscripción al campeonato completo: fechas ya corridas sin resultado →{" "}
            <strong className="font-semibold text-slate-400">DNC</strong>.
          </p>
          <p>
            <strong className="font-semibold text-slate-400">0</strong> = fecha futura sin puntaje publicado aún.
          </p>
        </div>
      ) : null}
    </section>
  );
}
