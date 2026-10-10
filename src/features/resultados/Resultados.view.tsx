import type { ReactNode } from "react";
import { ClassChips } from "../../ui/ClassChips";
import { ResultsScoringLegend } from "../../ui/ResultsScoringLegend";
import { ResultsCard, type ResultRow } from "../../ui/ResultsCard";
import { PdfExportLink } from "./PdfExportLink";

export function ResultadosView({
  title,
  titleLine1,
  titleLine2,
  classLabel,
  year,
  stamp,
  columns,
  rows,
  classNames,
  classFilter,
  onClassFilter,
  pdfFilename,
  legendScope,
  note
}: {
  title: string;
  titleLine1: string;
  titleLine2?: string;
  classLabel: string;
  year: string;
  stamp: string;
  columns: string[];
  rows: ResultRow[];
  classNames: string[];
  classFilter: string;
  onClassFilter: (value: string) => void;
  pdfFilename: string;
  legendScope: "fecha" | "final";
  note?: ReactNode;
}) {
  return (
    <div className="results-layout">
      <div className="results-layout__filters">
        <ClassChips
          title="Clase"
          names={classNames}
          value={classFilter}
          onChange={onClassFilter}
          showAll={false}
        />
      </div>

      <ResultsScoringLegend scope={legendScope} />

      <ResultsCard
        title={title}
        titleLine1={titleLine1}
        titleLine2={titleLine2}
        classLabel={classLabel}
        year={year}
        stamp={stamp}
        columns={columns}
        rows={rows}
      />

      <div className="results-layout__footer">
        {note ? <div className="results-layout__note results-note">{note}</div> : <span />}
        <PdfExportLink
          disabled={!rows.length}
          payload={{ title, classLabel, year, stamp, columns, rows, filename: pdfFilename }}
        />
      </div>
    </div>
  );
}
