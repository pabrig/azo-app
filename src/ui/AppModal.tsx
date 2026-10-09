import type { ReactNode } from "react";
import { useEffect } from "react";

export function AppModal({
  open,
  title,
  kicker,
  onClose,
  children,
  footer,
  size = "default"
}: {
  open: boolean;
  title: ReactNode;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
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
      className="app-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="app-modal-title"
        aria-modal="true"
        className={`app-modal ${size === "wide" ? "app-modal--wide" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            {kicker ? <p className="text-[10px] uppercase tracking-wide text-slate-500">{kicker}</p> : null}
            <h2 id="app-modal-title" className="text-sm font-bold text-slate-100">
              {title}
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
        <div className="text-[12px] text-slate-300 leading-relaxed">{children}</div>
        {footer ? <div className="mt-4 flex gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
