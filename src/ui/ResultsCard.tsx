import type { RefObject } from "react";

export type ResultRow = {
  id: string;
  position: number;
  sailNumber: string;
  name: string;
  boatClass: string;
  cells: string[];
  net: number;
};

function positionColor(index: number) {
  if (index === 0) return "text-amber-300";
  if (index === 1) return "text-slate-200";
  if (index === 2) return "text-amber-600";
  return "text-slate-400";
}

const thClass = "px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";
const tdClass = "px-2 py-2.5 align-middle text-[11px] leading-snug";

export function ResultsCard({
  cardRef,
  title,
  classLabel,
  year,
  stamp,
  columns,
  rows
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  title: string;
  classLabel: string;
  year: string;
  stamp: string;
  columns: string[];
  rows: ResultRow[];
}) {
  const colSpan = 5 + columns.length;
  return (
    <div ref={cardRef} className="bg-sea-800 rounded-2xl p-3 sm:p-4 border border-white/10 space-y-2.5">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/assets/cna-insignia.png" alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover bg-white" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold">Club Náutico Azopardo</p>
            <h2 className="font-black text-sm sm:text-base leading-tight">{title}</h2>
            <p className="text-[11px] text-slate-400 line-clamp-2">{classLabel}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-sea-900 border border-white/10 px-2 py-0.5 rounded-md shrink-0">
          {year}
        </span>
      </div>
      <div className="data-scroll rounded-xl border border-white/10 -mx-0.5">
        <table className="w-full min-w-[20rem] text-left border-collapse">
          <thead>
            <tr className="bg-sea-900 text-white">
              <th className={`${thClass} text-center w-9 min-w-[2.25rem]`}>Pos</th>
              <th className={`${thClass} min-w-[3.25rem]`}>Vela</th>
              <th className={`${thClass} min-w-[5.5rem] max-w-[7rem]`}>Timonel</th>
              <th className={`${thClass} min-w-[3.25rem] max-w-[4.5rem]`}>Clase</th>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`} className={`${thClass} text-center min-w-[2rem]`}>
                  {column}
                </th>
              ))}
              <th className={`${thClass} text-center bg-sea-900 text-cyan-400 min-w-[2.5rem] sticky right-0`}>
                Netos
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id} className={index % 2 ? "bg-sea-900/35" : undefined}>
                  <td className={`${tdClass} text-center font-bold tabular-nums ${positionColor(index)}`}>
                    {row.position}º
                  </td>
                  <td className={`${tdClass} font-mono font-bold text-cyan-400 tabular-nums whitespace-nowrap`}>
                    {row.sailNumber}
                  </td>
                  <td className={`${tdClass} font-medium line-clamp-2 max-w-[7rem]`}>{row.name}</td>
                  <td className={`${tdClass} text-slate-400 text-[10px] truncate max-w-[4.5rem]`}>{row.boatClass}</td>
                  {row.cells.map((cell, cellIndex) => (
                    <td key={`${row.id}-${cellIndex}`} className={`${tdClass} text-center tabular-nums whitespace-nowrap`}>
                      {cell}
                    </td>
                  ))}
                  <td
                    className={`${tdClass} text-center font-black text-cyan-300 bg-sea-900/70 tabular-nums sticky right-0`}
                  >
                    {row.net}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-slate-500">
                  Sin datos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[10px] text-slate-500 pt-0.5">
        <span>Comisión de Regata · Cómputos</span>
        <span className="tabular-nums">{stamp}</span>
      </div>
    </div>
  );
}
