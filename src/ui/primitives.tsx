import type { ReactNode } from "react";

export const controlClass =
  "mt-1 w-full bg-sea-900 border border-white/10 rounded-xl px-3 py-2.5";

export function Field({
  label,
  className = "",
  children
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] uppercase text-slate-400 font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-sea-800 rounded-2xl p-4 lg:p-5 border border-white/10 ${className}`}>{children}</section>
  );
}

export function SyncBadge({ mode, label }: { mode: "live" | "error" | "local"; label: string }) {
  const tone =
    mode === "live"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
      : mode === "error"
        ? "border-wheel/40 bg-red-500/15 text-red-200"
        : "border-amber-400/40 bg-amber-500/15 text-amber-200";
  return (
    <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${tone}`}>{label}</span>
  );
}

export function Toast({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className={`app-toast fixed left-1/2 -translate-x-1/2 z-50 bg-cyan-500 text-sea-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xl pointer-events-none transition ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {text}
    </div>
  );
}

export { ClassChips } from "./ClassChips";

export function FechaBar({
  events,
  activeId,
  onSelect
}: {
  events: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (!events.length) {
    return <p className="text-xs text-slate-500 px-2 py-1">Sin fechas. Creálas en la pestaña Fechas.</p>;
  }
  return (
    <div className="class-chips-scroll flex gap-1 overflow-x-auto py-0.5">
      {events.map((event) => {
        const selected = event.id === activeId;
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            className={`shrink-0 py-1 px-2.5 rounded-md text-[10px] font-bold leading-none whitespace-nowrap ${selected ? "bg-cyan-500 text-sea-900" : "bg-white/10 text-slate-400"}`}
          >
            {event.name}
          </button>
        );
      })}
    </div>
  );
}

export { BottomNav, SideNav } from "./AppNavigation";
