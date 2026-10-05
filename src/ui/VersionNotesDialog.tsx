import { useEffect } from "react";
import { APP_VERSION, CURRENT_RELEASE_NOTES } from "../app/release-notes";

export function VersionNotesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/35"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="version-notes-title"
        aria-modal="true"
        className="w-full max-w-sm bg-sea-800 border border-white/10 rounded-2xl p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Novedades</p>
            <h2 id="version-notes-title" className="text-sm font-bold text-slate-100">
              Versión {APP_VERSION}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none px-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <ul className="text-[11px] text-slate-400 leading-relaxed space-y-1.5 list-none">
          {CURRENT_RELEASE_NOTES.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-cyan-500/80 shrink-0">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl text-[11px] font-semibold bg-white/5 text-slate-300"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
