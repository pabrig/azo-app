import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AppModal } from "./AppModal";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(ok: boolean) {
    pendingRef.current?.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AppModal
        open={Boolean(pending)}
        title={pending?.title || ""}
        kicker="Confirmar"
        onClose={() => close(false)}
        footer={
          pending ? (
            <>
              <button type="button" className="app-modal-btn app-modal-btn--ghost" onClick={() => close(false)}>
                {pending.cancelLabel || "Cancelar"}
              </button>
              <button
                type="button"
                className={`app-modal-btn ${pending.danger ? "app-modal-btn--danger" : "app-modal-btn--primary"}`}
                onClick={() => close(true)}
              >
                {pending.confirmLabel || "Confirmar"}
              </button>
            </>
          ) : null
        }
      >
        {pending?.message}
      </AppModal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
