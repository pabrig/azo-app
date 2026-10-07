import { APP_VERSION, CURRENT_RELEASE_NOTES } from "../app/release-notes";
import { AppModal } from "./AppModal";

export function VersionNotesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AppModal
      open={open}
      kicker="Novedades"
      title={`Versión ${APP_VERSION}`}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="app-modal-btn app-modal-btn--ghost w-full">
          Listo
        </button>
      }
    >
      <ul className="space-y-1.5 list-none">
        {CURRENT_RELEASE_NOTES.map((line) => (
          <li key={line} className="flex gap-2 text-slate-400">
            <span className="text-cyan-500/80 shrink-0">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </AppModal>
  );
}
