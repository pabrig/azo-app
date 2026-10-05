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

/** Compact table: more rows on screen, still scannable (tabular nums + contrast). */
const th =
  "px-1.5 py-1.5 lg:px-2 lg:py-2 text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-slate-400";
const td = "px-1.5 py-1.5 lg:px-2 lg:py-2 align-middle text-[11px] lg:text-[13px] leading-tight";
const tdBody = `${td} text-slate-300`;

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
    <div ref={cardRef} className="results-card bg-sea-800 rounded-xl p-2.5 sm:p-3 lg:p-4 border border-white/10 space-y-2 lg:space-y-3">
      <div className="results-card__head flex items-start justify-between gap-1.5 border-b border-white/10 pb-2 lg:pb-3">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <img
            src="/assets/cna-insignia.png"
            alt=""
            className="h-9 w-9 lg:h-10 lg:w-10 shrink-0 rounded-md object-cover bg-white"
          />
          <div className="min-w-0">
            <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-cyan-400 font-bold leading-none">
              Club Náutico Azopardo
            </p>
            <h2 className="font-black text-sm sm:text-base lg:text-lg leading-tight mt-0.5">{title}</h2>
            <p className="text-[10px] lg:text-xs text-slate-400 line-clamp-2 lg:line-clamp-1 leading-tight">{classLabel}</p>
          </div>
        </div>
        <span className="text-[10px] lg:text-xs font-mono bg-sea-900 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
          {year}
        </span>
      </div>
      <div className="data-scroll data-scroll--results rounded-lg border border-white/10">
        <table className="results-table w-full min-w-[19rem] text-left border-collapse">
          <thead>
            <tr className="bg-sea-900 text-white">
              <th
                className={`${th} results-col-pos-header text-center w-9 min-w-[2.25rem] !text-amber-200/90`}
                style={{ left: 0 }}
              >
                Pos
              </th>
              <th className={`${th} results-col-vela-header min-w-[3rem] !text-cyan-400`}>Vela</th>
              <th className={`${th} min-w-[5.25rem] max-w-[6.5rem]`}>Timonel</th>
              <th className={`${th} min-w-[2.75rem]`}>Clase</th>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`} className={`${th} text-center min-w-[2rem]`}>
                  {column}
                </th>
              ))}
              <th className={`${th} results-col-net-header text-center min-w-[2.5rem] !text-cyan-400`}>Netos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id} className={index % 2 ? "bg-sea-900/40" : undefined}>
                  <td
                    className={`${td} results-col-pos text-center font-bold tabular-nums ${positionColor(index)}`}
                    style={{ left: 0 }}
                  >
                    {row.position}º
                  </td>
                  <td className={`${td} results-col-vela font-mono font-bold text-cyan-400 tabular-nums whitespace-nowrap`}>
                    {row.sailNumber}
                  </td>
                  <td className={`${tdBody} font-medium truncate max-w-[6.5rem]`} title={row.name}>
                    {row.name}
                  </td>
                  <td className={`${tdBody} text-slate-500 text-[10px] truncate max-w-[3.5rem]`}>{row.boatClass}</td>
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={`${row.id}-${cellIndex}`}
                      className={`${tdBody} text-center tabular-nums whitespace-nowrap`}
                    >
                      {cell}
                    </td>
                  ))}
                  <td className={`${td} results-col-net text-center font-black text-cyan-300 tabular-nums`}>
                    {row.net}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6 text-center text-xs text-slate-500">
                  Sin datos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-x-2 text-[9px] text-slate-500 leading-none">
        <span>Comisión de Regata · Cómputos</span>
        <span className="tabular-nums">{stamp}</span>
      </div>
    </div>
  );
}
