import { useState, type ReactNode } from "react";
import { APP_VERSION } from "../../app/release-notes";
import type { SyncStatus, ToastState } from "../../app/championship-context";
import type { TabId } from "../../domain/types";
import { BottomNav, FechaBar, SideNav, SyncBadge, Toast } from "../../ui/primitives";
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
  children: ReactNode;
}) {
  const [versionNotesOpen, setVersionNotesOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-header shrink-0 z-30 bg-sea-900/90 backdrop-blur-md border-b border-white/10">
        <div className="app-header-inner flex items-center gap-2.5 sm:gap-3 min-h-[var(--header-min-h)]">
          <img
            src="/assets/cna-insignia.png"
            alt=""
            className="h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-lg object-cover bg-white shrink-0 ring-1 ring-white/20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
              <h1 className="font-semibold text-sm sm:text-[15px] lg:text-base tracking-tight truncate text-slate-100">
                Club Náutico Azopardo
              </h1>
              <button
                type="button"
                onClick={() => setVersionNotesOpen(true)}
                className="shrink-0 text-[9px] sm:text-[10px] text-slate-500 font-mono tabular-nums px-1 py-0.5 rounded hover:text-cyan-400/90"
                aria-label={`Versión ${APP_VERSION}. Ver novedades`}
              >
                v{APP_VERSION}
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] lg:text-xs text-cyan-400/90 truncate leading-tight">
              Campeonato Vela Ligera
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showSync ? <SyncBadge mode={sync.mode} label={sync.label} /> : null}
            {showLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="app-icon-btn lg:w-10 lg:h-10"
                aria-label="Salir de comisión"
                title="Salir"
              >
                <IconLogOut size={20} />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="app-frame flex-1 min-h-0 flex">
        <aside className="app-sidebar hidden lg:flex shrink-0">
          <SideNav tab={tab} onChange={onTab} />
        </aside>

        <main className="app-main flex-1 min-h-0 overflow-y-auto">
          <div className="app-main-inner space-y-2.5 sm:space-y-3 lg:space-y-4">
            {canal}
            {showFechaBar ? (
              <div className="fecha-bar-wrap bg-sea-900/60 p-1 lg:p-1.5 rounded-xl border border-white/10">
                <FechaBar events={events} activeId={activeFechaId} onSelect={onSelectFecha} />
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>

      <BottomNav tab={tab} onChange={onTab} />
      <Toast text={toast.text} visible={toast.visible} />
      <VersionNotesDialog open={versionNotesOpen} onClose={() => setVersionNotesOpen(false)} />
    </div>
  );
}
