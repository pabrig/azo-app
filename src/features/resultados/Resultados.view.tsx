import type { ReactNode, RefObject } from "react";
import { ClassChips } from "../../ui/primitives";
import { ResultsCard, type ResultRow } from "../../ui/ResultsCard";

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
  onShare,
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
  onShare: () => void;
  note?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={onShare} className="w-full bg-cyan-500 text-sea-900 font-bold text-xs py-2.5 rounded-xl">
        Compartir captura PNG
      </button>
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
