import type { ReactNode } from "react";
import type { TabId } from "../../domain/types";
import { BottomNav, FechaBar, SyncBadge, Toast } from "../../ui/primitives";
import type { SyncStatus, ToastState } from "../../app/championship-context";

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
  return (
    <div className="app-shell">
      <header className="shrink-0 z-30 bg-sea-800/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/cna-insignia.png"
              alt="Club Náutico Azopardo"
              className="h-11 w-11 rounded-xl object-cover bg-white shadow"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-wide truncate">Club Náutico Azopardo</h1>
              <p className="text-[11px] text-cyan-400 truncate">Campeonato Vela Ligera</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {showSync ? <SyncBadge mode={sync.mode} label={sync.label} /> : null}
            {showLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/10 text-slate-200"
              >
                Salir
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className="flex-1 min-h-0 overflow-y-auto max-w-3xl w-full mx-auto px-3 py-3 space-y-3"
        style={{ paddingBottom: "calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))" }}
      >
        {canal}
        {showFechaBar ? (
          <div className="bg-sea-900/80 p-1.5 rounded-2xl border border-white/10">
            <FechaBar events={events} activeId={activeFechaId} onSelect={onSelectFecha} />
          </div>
        ) : null}
        {children}
      </main>
      <BottomNav tab={tab} onChange={onTab} />
      <Toast text={toast.text} visible={toast.visible} />
    </div>
  );
}
