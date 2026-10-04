import type { FormEvent } from "react";
import type { Sailor } from "../../domain/types";
import { Card, ClassChips, controlClass } from "../../ui/primitives";

export function CargaView({
  locked,
  hasEvent,
  subtitle,
  classNames,
  classFilter,
  racesCount,
  sailors,
  scoresFor,
  onUnlock,
  onClassFilter,
  onAddRace,
  onRemoveRace,
  onScore
}: {
  locked: boolean;
  hasEvent: boolean;
  subtitle: string;
  classNames: string[];
  classFilter: string;
  racesCount: number;
  sailors: Sailor[];
  scoresFor: (sailorId: string) => Array<string | null | undefined>;
  onUnlock: (event: FormEvent<HTMLFormElement>) => void;
  onClassFilter: (value: string) => void;
  onAddRace: () => void;
  onRemoveRace: () => void;
  onScore: (sailorId: string, raceIndex: number, value: string) => void;
}) {
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
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Carga de resultados</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={onAddRace} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
            + Regata
          </button>
          <button type="button" onClick={onRemoveRace} className="bg-white/10 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl">
            −
          </button>
        </div>
      </div>
      <ClassChips names={classNames} value={classFilter} onChange={onClassFilter} />
      <p className="text-[11px] text-slate-400">Puesto o código: DNC, DNS, OCS, DNF, DSQ.</p>
      {hasEvent ? (
      <div className="competitor-scroll rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-sea-900 text-slate-400">
              <th className="p-2 sticky-col-header bg-sea-900 min-w-[120px]">Vela</th>
              {columns.map((index) => (
                <th key={index} className="p-2 text-center min-w-[72px]">
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
                    <td className="p-2 sticky-col bg-sea-800">
                      <p className="font-mono font-bold text-cyan-400">{sailor.sailNumber}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{sailor.name}</p>
                    </td>
                    {columns.map((index) => (
                      <td key={index} className="p-1 text-center">
                        <select
                          value={scores[index] ?? ""}
                          onChange={(event) => onScore(sailor.id, index, event.target.value)}
                          className="w-[4.25rem] h-10 bg-sea-900 border border-white/10 rounded-lg text-center font-bold"
                        >
                          <option value="">—</option>
                          {Array.from({ length: 30 }, (_, position) => (
                            <option key={position + 1} value={String(position + 1)}>
                              {position + 1}
                            </option>
                          ))}
                          {["DNC", "DNS", "OCS", "DNF", "DSQ"].map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={racesCount + 1}>
                  Sin inscriptos en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
    </Card>
  );
}
