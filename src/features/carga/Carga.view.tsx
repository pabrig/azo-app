import { useState, type FormEvent } from "react";
import { canonicalScoreCell, COMMISSION_PENALTY_OPTIONS } from "../../domain/score-entry";
import type { Sailor } from "../../domain/types";
import { AppModal } from "../../ui/AppModal";
import { ScoreCellLegend } from "../../ui/ScoreCellLegend";
import { Card, ClassChips, controlClass } from "../../ui/primitives";

type ScorePick = {
  sailorId: string;
  raceIndex: number;
  sailNumber: string;
  sailorName: string;
  value: string;
};

export function CargaView({
  locked,
  hasEvent,
  subtitle,
  summaryLine,
  classNames,
  classFilter,
  racesCount,
  sailors,
  scoresFor,
  onUnlock,
  onClassFilter,
  onScore,
  raceCellLegend
}: {
  locked: boolean;
  hasEvent: boolean;
  subtitle: string;
  summaryLine: string;
  classNames: string[];
  classFilter: string;
  racesCount: number;
  sailors: Sailor[];
  scoresFor: (sailorId: string) => Array<string | null | undefined>;
  onUnlock: (event: FormEvent<HTMLFormElement>) => void;
  onClassFilter: (value: string) => void;
  onScore: (sailorId: string, raceIndex: number, value: string) => void;
  raceCellLegend?: (sailor: Sailor, raceIndex: number) => string | null;
}) {
  const [pick, setPick] = useState<ScorePick | null>(null);

  if (locked) {
    return (
      <Card className="space-y-3">
        <h2 className="font-bold">Comisión de Regata</h2>
        <p className="text-sm text-slate-400">PIN para cargar puestos, fechas, clases, canal WhatsApp y AR/IR.</p>
        <form onSubmit={onUnlock} className="flex gap-2">
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN"
            className={`flex-1 ${controlClass} mt-0`}
          />
          <button className="bg-cyan-500 text-sea-900 font-bold px-4 rounded-xl">Entrar</button>
        </form>
      </Card>
    );
  }

  const columns = Array.from({ length: racesCount }, (_, index) => index);

  return (
    <Card className="space-y-2.5 !p-3 sm:!p-4">
      <div className="min-w-0">
        <h2 className="font-bold text-[15px]">Carga de resultados</h2>
        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{subtitle}</p>
      </div>

      {hasEvent ? (
        <div className="rounded-xl border border-white/10 bg-sea-900/50 px-3 py-2.5 space-y-1.5">
          <p className="text-[13px] font-semibold text-cyan-300 leading-snug">{summaryLine}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tocá una celda para cargar o corregir. Placa y ranking se actualizan al momento. La cantidad de regatas y
            descartes se edita en Fechas, en cada fecha.
          </p>
        </div>
      ) : null}

      <div className="carga-layout">
        <div className="carga-layout__filters">
          <ClassChips title="Clases" names={classNames} value={classFilter} onChange={onClassFilter} showAll={false} />
        </div>
        <p className="carga-layout__hint text-[10px] lg:text-xs text-slate-500 leading-relaxed">
          Tocá una celda para cargar o corregir, también en fechas ya corridas.
        </p>
        <div className="carga-layout__table min-w-0">
          {hasEvent ? (
            <div className="data-scroll data-scroll--entry rounded-xl border border-white/10 -mx-0.5">
              <table className="w-full min-w-[16rem] text-left border-collapse">
                <thead>
                  <tr className="bg-sea-900 text-slate-400">
                    <th className="px-2.5 py-2.5 text-[10px] font-semibold uppercase sticky-col-header bg-sea-900 min-w-[6.75rem]">
                      Vela
                    </th>
                    {columns.map((index) => (
                      <th key={index} className="px-1.5 py-2.5 text-[10px] font-semibold text-center min-w-[3.5rem]">
                        R{index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sailors.length ? (
                    sailors.map((sailor) => {
                      const scores = scoresFor(sailor.id);
                      return (
                        <tr key={sailor.id} className="border-t border-white/5">
                          <td className="px-2.5 py-2 sticky-col bg-sea-800 align-top min-w-[6.75rem]">
                            <p className="font-mono font-bold text-cyan-400 text-[11px] leading-tight">{sailor.sailNumber}</p>
                            <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-0.5">{sailor.name}</p>
                          </td>
                          {columns.map((index) => {
                            const legend = raceCellLegend?.(sailor, index);
                            const value = canonicalScoreCell(scores[index]);
                            const display =
                              COMMISSION_PENALTY_OPTIONS.find((item) => item.value === value)?.label || value || "—";
                            return (
                              <td key={index} className="px-1 py-1.5 text-center align-middle">
                                <div className="carga-score-cell">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPick({
                                        sailorId: sailor.id,
                                        raceIndex: index,
                                        sailNumber: sailor.sailNumber,
                                        sailorName: sailor.name,
                                        value
                                      })
                                    }
                                    className="w-[4.25rem] max-w-full h-9 bg-sea-900 border border-white/10 rounded-lg text-center text-[12px] font-bold tabular-nums"
                                  >
                                    {display}
                                  </button>
                                  {legend?.includes("(desc.)") ? <ScoreCellLegend text={legend} /> : null}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={racesCount + 1}>
                        Sin inscriptos en este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <AppModal
        open={Boolean(pick)}
        size="wide"
        title={
          pick ? (
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-mono text-cyan-300">{pick.sailNumber}</span>
                <span className="text-slate-500 font-semibold">· R{pick.raceIndex + 1}</span>
              </span>
              <span className="font-normal text-[11px] leading-tight text-slate-400 truncate">{pick.sailorName}</span>
            </span>
          ) : (
            "Resultado"
          )
        }
        kicker="Cargar o corregir"
        onClose={() => setPick(null)}
      >
        {pick ? (
          <ScorePad
            value={pick.value}
            onPick={(value) => {
              onScore(pick.sailorId, pick.raceIndex, value);
              setPick(null);
            }}
          />
        ) : null}
      </AppModal>
    </Card>
  );
}

function ScorePad({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  return (
    <div>
      <div className="score-pad">
        {Array.from({ length: 30 }, (_, position) => {
          const code = String(position + 1);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onPick(code)}
              className={`score-pad__btn ${value === code ? "score-pad__btn--on" : ""}`}
            >
              {code}
            </button>
          );
        })}
      </div>
      <div className="score-pad__penalties">
        <button
          type="button"
          onClick={() => onPick("")}
          className={`score-pad__btn ${value === "" ? "score-pad__btn--on" : ""}`}
        >
          Vacío
        </button>
        {COMMISSION_PENALTY_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPick(item.value)}
            className={`score-pad__btn ${value === item.value ? "score-pad__btn--on" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
