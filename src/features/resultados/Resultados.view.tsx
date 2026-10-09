import type { ReactNode } from "react";
import { ClassChips } from "../../ui/ClassChips";
import { ResultsCard, type ResultRow } from "../../ui/ResultsCard";
import { PdfExportLink } from "./PdfExportLink";

export function ResultadosView({
  title,
  classLabel,
  year,
  stamp,
  columns,
  rows,
  classNames,
  classFilter,
  onClassFilter,
  pdfFilename,
  note
}: {
  title: string;
  classLabel: string;
  year: string;
  stamp: string;
  columns: string[];
  rows: ResultRow[];
  classNames: string[];
  classFilter: string;
  onClassFilter: (value: string) => void;
  pdfFilename: string;
  note?: ReactNode;
}) {
  return (
    <div className="results-layout">
      <div className="results-layout__filters">
        <ClassChips
          title="Resultados"
          names={classNames}
          value={classFilter}
          onChange={onClassFilter}
          showAll={false}
        />
      </div>

      <ResultsCard title={title} classLabel={classLabel} year={year} stamp={stamp} columns={columns} rows={rows} />

      <div className="results-layout__footer">
        {note ? <div className="results-layout__note">{note}</div> : <span />}
        <PdfExportLink
          disabled={!rows.length}
          payload={{ title, classLabel, year, stamp, columns, rows, filename: pdfFilename }}
        />
      </div>
    </div>
  );
}
