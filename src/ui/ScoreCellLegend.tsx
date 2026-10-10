/** Misma leyenda en clasificaciones y vista previa de carga (p. ej. DNC + badge desc.). */
export function ScoreCellLegend({ text }: { text: string }) {
  const match = text.match(/^(.+?)\s+\(desc\.\)$/);
  if (!match) return <span className="score-cell-value">{text}</span>;
  return (
    <span className="score-cell-legend score-cell-legend--discarded">
      <span className="score-cell-legend__code">{match[1]}</span>
      <span className="score-cell-legend__badge">desc.</span>
    </span>
  );
}
