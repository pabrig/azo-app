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
    <section className={`bg-sea-800 rounded-2xl p-4 border border-white/10 ${className}`}>{children}</section>
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
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-cyan-500 text-sea-900 px-4 py-2 rounded-2xl text-xs font-bold shadow-xl pointer-events-none transition ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {text}
    </div>
  );
}

export function ClassChips({
  names,
  value,
  onChange
}: {
  names: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
      {["ALL", ...names].map((name) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${selected ? "bg-cyan-500 text-sea-900" : "bg-white/10 text-slate-300"}`}
          >
            {name === "ALL" ? "Todas" : name}
          </button>
        );
      })}
    </div>
  );
}

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
    <div className="flex gap-1 overflow-x-auto">
      {events.map((event) => {
        const selected = event.id === activeId;
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            className={`fecha-chip shrink-0 py-2 px-3 rounded-xl text-xs font-bold ${selected ? "bg-cyan-500 text-sea-900" : "text-slate-400"}`}
          >
            {event.name}
          </button>
        );
      })}
    </div>
  );
}

const TABS = [
  { id: "inscripcion", icon: "✎", label: "Insc." },
  { id: "fechas", icon: "📅", label: "Fechas" },
  { id: "carga", icon: "📋", label: "Carga" },
  { id: "placa", icon: "🏁", label: "Placa" },
  { id: "ranking", icon: "🏆", label: "Ranking" }
] as const;

export function BottomNav({
  tab,
  onChange
}: {
  tab: (typeof TABS)[number]["id"];
  onChange: (tab: (typeof TABS)[number]["id"]) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-sea-800/95 backdrop-blur border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-5 py-2 px-0.5">
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`nav-btn ${selected ? "text-cyan-400 font-bold" : "text-slate-400"}`}
            >
              <span className="block text-base leading-none">{item.icon}</span>
              <span className="text-[9px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
