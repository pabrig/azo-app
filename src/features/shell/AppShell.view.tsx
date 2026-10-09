import { useState, type ReactNode } from "react";
import { APP_VERSION } from "../../app/release-notes";
import type { SyncStatus, ToastState } from "../../app/championship-context";
import type { TabId } from "../../domain/types";
import { BottomNav, FechaBar, SyncBadge, Toast, TopNav } from "../../ui/primitives";
import { IconLogOut } from "../../ui/nav-icons";
import { VersionNotesDialog } from "../../ui/VersionNotesDialog";

export function AppShellView({
  sync,
  toast,
  tab,
  showFechaBar,
  events,
  activeFechaId,
  onSelectFecha,
  showSync,
  showLogout,
  onLogout,
  onTab,
  canal,
  fechaBrief,
  children
}: {
  sync: SyncStatus;
  toast: ToastState;
  tab: TabId;
  showFechaBar: boolean;
  events: { id: string; name: string }[];
  activeFechaId: string;
  onSelectFecha: (id: string) => void;
  showSync: boolean;
  showLogout: boolean;
  onLogout: () => void;
  onTab: (tab: TabId) => void;
  canal: ReactNode;
  fechaBrief: ReactNode;
  children: ReactNode;
}) {
  const [versionNotesOpen, setVersionNotesOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-header shrink-0 z-30 bg-sea-900/95 backdrop-blur-md border-b border-white/10">
        <div className="app-header-bar">
          <div className="app-header-inner flex items-center gap-3 min-h-[var(--header-min-h)]">
            <img
              src="/assets/cna-insignia.png"
              alt=""
              className="h-9 w-9 lg:h-10 lg:w-10 rounded-lg object-cover bg-white shrink-0 ring-1 ring-white/20"
            />
            <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h1 className="font-semibold text-sm lg:text-[15px] tracking-tight truncate text-slate-100">
                    Club Náutico Azopardo
                  </h1>
                  <button
                    type="button"
                    onClick={() => setVersionNotesOpen(true)}
                    className="shrink-0 text-[9px] lg:text-[10px] text-slate-500 font-mono tabular-nums hover:text-cyan-400/90"
                    aria-label={`Versión ${APP_VERSION}. Ver novedades`}
                  >
                    v{APP_VERSION}
                  </button>
                </div>
                <p className="text-[10px] lg:text-[11px] text-cyan-400/85 truncate leading-tight">
                  Campeonato Vela Ligera
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {showSync ? <SyncBadge mode={sync.mode} label={sync.label} /> : null}
              {showLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="app-icon-btn"
                  aria-label="Salir de comisión"
                  title="Salir"
                >
                  <IconLogOut size={20} />
                </button>
              ) : null}
            </div>
          </div>
          <TopNav tab={tab} onChange={onTab} />
        </div>
      </header>

      <main className="app-main flex-1 min-h-0 overflow-y-auto">
        <div className="app-main-inner space-y-2.5 sm:space-y-3 lg:space-y-4">
          {canal}
          {fechaBrief}
          {showFechaBar ? (
            <div className="fecha-bar-wrap bg-sea-900/60 p-1 lg:p-1.5 rounded-xl border border-white/10">
              <FechaBar events={events} activeId={activeFechaId} onSelect={onSelectFecha} />
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <BottomNav tab={tab} onChange={onTab} />
      <Toast text={toast.text} visible={toast.visible} />
      <VersionNotesDialog open={versionNotesOpen} onClose={() => setVersionNotesOpen(false)} />
    </div>
  );
}
