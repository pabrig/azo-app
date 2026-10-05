import type { ReactNode, RefObject } from "react";
import { ClassChips } from "../../ui/primitives";
import { ResultsCard, type ResultRow } from "../../ui/ResultsCard";
import { ComprobanteToolbar } from "./ComprobanteToolbar";

export function ResultadosView({
  cardRef,
  title,
  classLabel,
  year,
  stamp,
  columns,
  rows,
  classNames,
  classFilter,
  onClassFilter,
  onToast,
  pngFilename,
  note
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  title: string;
  classLabel: string;
  year: string;
  stamp: string;
  columns: string[];
  rows: ResultRow[];
  classNames: string[];
  classFilter: string;
  onClassFilter: (value: string) => void;
  onToast: (message: string) => void;
  pngFilename: string;
  note?: ReactNode;
}) {
  return (
    <div className="results-layout">
      <div className="results-layout__filters">
        <ClassChips title="Resultados" names={classNames} value={classFilter} onChange={onClassFilter} />
      </div>

      <div className="results-layout__body">
        <div className="results-layout__main min-w-0">
          <ResultsCard
            cardRef={cardRef}
            title={title}
            classLabel={classLabel}
            year={year}
            stamp={stamp}
            columns={columns}
            rows={rows}
          />
          <div className="lg:hidden">
            <ComprobanteToolbar cardRef={cardRef} filename={pngFilename} onToast={onToast} />
          </div>
          {note ? <div className="results-layout__note">{note}</div> : null}
        </div>

        <aside className="results-layout__rail hidden lg:block">
          <ComprobanteToolbar cardRef={cardRef} filename={pngFilename} onToast={onToast} />
        </aside>
      </div>
    </div>
  );
}
