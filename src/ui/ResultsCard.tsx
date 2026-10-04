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
    <div ref={cardRef} className="bg-sea-800 rounded-2xl p-4 border border-white/10 space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/assets/cna-insignia.png" alt="" className="h-12 w-12 rounded-lg object-cover bg-white" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Club Náutico Azopardo</p>
            <h2 className="font-black text-base leading-tight">{title}</h2>
            <p className="text-xs text-slate-400">{classLabel}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-sea-900 border border-white/10 px-2 py-1 rounded-md">{year}</span>
      </div>
      <div className="competitor-scroll rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-sea-900 text-white">
              <th className="p-2 text-center">Pos</th>
              <th className="p-2">Vela</th>
              <th className="p-2">Timonel</th>
              <th className="p-2">Clase</th>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`} className="p-2 text-center">
                  {column}
                </th>
              ))}
              <th className="p-2 text-center bg-sea-900 text-cyan-400">Netos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id} className={index % 2 ? "bg-sea-900/40" : undefined}>
                  <td className={`p-2 text-center font-bold ${positionColor(index)}`}>{row.position}º</td>
                  <td className="p-2 font-mono font-bold text-cyan-400">{row.sailNumber}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-slate-400">{row.boatClass}</td>
                  {row.cells.map((cell, cellIndex) => (
                    <td key={`${row.id}-${cellIndex}`} className="p-2 text-center">
                      {cell}
                    </td>
                  ))}
                  <td className="p-2 text-center font-black text-cyan-300 bg-sea-900/60">{row.net}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="p-6 text-center text-slate-500">
                  Sin datos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
        <span>Comisión de Regata · Cómputos</span>
        <span>{stamp}</span>
      </div>
    </div>
  );
}
