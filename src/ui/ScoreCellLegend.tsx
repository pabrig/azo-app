/** Misma leyenda en placa/ranking y vista previa de carga (p. ej. DNC (desc.)). */
export function ScoreCellLegend({ text }: { text: string }) {
  if (!text.includes("(desc.)")) return <>{text}</>;
  return <span className="score-cell-legend score-cell-legend--discarded">{text}</span>;
}
