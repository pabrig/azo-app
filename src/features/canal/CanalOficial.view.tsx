export function CanalOficialView({
  isAdmin,
  onOpen,
  onEdit
}: {
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-sea-800 px-3 py-2.5 lg:px-4 lg:py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c4.46 0 8.11 3.65 8.11 8.11 0 4.47-3.65 8.11-8.11 8.11-1.42 0-2.8-.37-4.01-1.06l-.29-.17-3.12.82.83-3.04-.18-.3a8.07 8.07 0 0 1-1.23-4.36c0-4.46 3.65-8.11 8.11-8.11zm4.62 10.45c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.13-.17.25-.65.82-.8 1-.15.17-.3.2-.55.07-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.12-.12.25-.3.38-.45.12-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.07-.13-.57-1.37-.78-1.88-.2-.48-.41-.42-.57-.42h-.48c-.17 0-.45.06-.68.32-.23.25-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.17 1.81 2.76 4.39 3.87 1.64.71 2.28.77 3.1.65.47-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.3z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Canal oficial · TOA</p>
          <p className="text-xs text-slate-300 leading-snug">Informes de la Comisión solo por este grupo.</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 bg-emerald-500 text-sea-900 font-bold text-xs px-3 py-2 rounded-xl active:scale-95"
        >
          Abrir
        </button>
        {isAdmin ? (
          <button type="button" onClick={onEdit} className="shrink-0 text-[10px] text-slate-500 px-1">
            Editar
          </button>
        ) : null}
      </div>
    </section>
  );
}
