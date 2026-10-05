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
    <div className="space-y-3">
      <ComprobanteToolbar cardRef={cardRef} filename={pngFilename} onToast={onToast} />
      <ClassChips names={classNames} value={classFilter} onChange={onClassFilter} />
      {note}
      <ResultsCard
        cardRef={cardRef}
        title={title}
        classLabel={classLabel}
        year={year}
        stamp={stamp}
        columns={columns}
        rows={rows}
      />
    </div>
  );
}
