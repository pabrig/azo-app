import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { config } from "../config";
import { createCloudSync, type CloudSync } from "../data/appwrite-sync";
import { loadLocalState, persistLocal, readAdminSession, writeAdminSession } from "../data/local-store";
import { hasCloudChampionship, mergeRemote } from "../domain/cloud";
import { boatClasses, currentEvent, isFechaRegistrationClosed } from "../domain/model";
import {
  addRace,
  deleteBoatClass,
  deleteFecha,
  registerSailor,
  removeRace,
  removeSailor,
  saveBoatClass,
  saveFecha,
  saveWhatsapp,
  selectClassFilter,
  selectFecha,
  setDiscardsAllowed as applyDiscardsAllowed,
  updateSailor as applySailorUpdate,
  updateScore
} from "../domain/mutations";
import type {
  ChampionshipState,
  ClassSaveInput,
  FechaSaveInput,
  RegisterInput,
  SailorSaveInput,
  TabId
} from "../domain/types";
import {
  ChampionshipContext,
  type ChampionshipContextValue,
  type SyncStatus,
  type ToastState
} from "./championship-context";

export function ChampionshipProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChampionshipState>(() => loadLocalState());
  const [isAdmin, setIsAdmin] = useState(() => readAdminSession());
  const [tab, setTab] = useState<TabId>("inscripcion");
  const [sync, setSync] = useState<SyncStatus>({ mode: "local", label: "Local" });
  const [toast, setToast] = useState<ToastState>({ text: "Listo", visible: false });
  const [whatsappFocus, setWhatsappFocus] = useState(0);
  const stateRef = useRef(state);
  const syncRef = useRef<CloudSync | null>(null);
  const toastTimer = useRef(0);
  stateRef.current = state;

  function showToast(message: string) {
    setToast({ text: message, visible: true });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 2200);
  }

  function commit(next: ChampionshipState, cloud = true) {
    stateRef.current = next;
    setState(next);
    const error = persistLocal(next);
    if (error) showToast(error);
    if (cloud) syncRef.current?.schedule();
  }

  function applyState(next: ChampionshipState) {
    syncRef.current?.markApplying(true);
    try {
      stateRef.current = next;
      setState(next);
      const error = persistLocal(next);
      if (error) showToast(error);
    } finally {
      syncRef.current?.markApplying(false);
    }
  }

  function applyRemote(row: unknown) {
    if (!hasCloudChampionship(row)) return;
    try {
      applyState(mergeRemote(stateRef.current, row));
    } catch (error) {
      console.warn(error);
    }
  }

  useEffect(() => {
    const cloud = createCloudSync({
      getState: () => stateRef.current,
      applyRemote,
      applyState,
      onStatus: (mode, label) => setSync({ mode, label })
    });
    syncRef.current = cloud;
    void cloud.init();
    const onOnline = () => {
      showToast("Red disponible: sincronizando…");
      if (cloud.isReady()) void cloud.push();
      else void cloud.init();
    };
    const onOffline = () => setSync({ mode: "error", label: "Sin señal" });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cloud.dispose();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // El sincronizador se crea una sola vez y lee el estado por ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ChampionshipContextValue>(() => {
    return {
      state,
      sync,
      isAdmin,
      tab,
      toast,
      whatsappFocus,
      showToast,
      setTab,
      setFecha(id: string) {
        commit(selectFecha(stateRef.current, id), false);
      },
      setClassFilter(className: string) {
        commit(selectClassFilter(stateRef.current, className), false);
      },
      registerSailor(input: RegisterInput) {
        if (!currentEvent(stateRef.current)) {
          showToast("No hay fechas creadas");
          return;
        }
        const targetFecha = stateRef.current.events.find((event) => event.id === input.fecha);
        if (!isAdmin && targetFecha && isFechaRegistrationClosed(targetFecha)) {
          showToast("Inscripción cerrada: esa fecha ya se disputó");
          return;
        }
        const result = registerSailor(stateRef.current, input);
        commit(result.state);
        showToast(result.toast);
      },
      updateSailor(input: SailorSaveInput) {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          setTab("carga");
          return false;
        }
        const result = applySailorUpdate(stateRef.current, input);
        if (!result.state) {
          showToast(result.error || "No se pudo guardar");
          return false;
        }
        commit(result.state);
        showToast("Inscripto actualizado");
        return true;
      },
      deleteSailor(id: string) {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          setTab("carga");
          return;
        }
        commit(removeSailor(stateRef.current, id));
        showToast("Eliminado");
      },
      unlockAdmin(pin: string) {
        if (pin.trim() !== config.adminPin) {
          showToast("PIN incorrecto");
          return false;
        }
        writeAdminSession(true);
        setIsAdmin(true);
        showToast("Comisión desbloqueada");
        return true;
      },
      addRace() {
        commit(addRace(stateRef.current));
      },
      removeRace() {
        commit(removeRace(stateRef.current));
      },
      setDiscardsAllowed(count: number) {
        commit(applyDiscardsAllowed(stateRef.current, count));
      },
      updateScore(sailorId: string, raceIdx: number, score: string) {
        commit(updateScore(stateRef.current, sailorId, raceIdx, score));
      },
      saveFecha(input: FechaSaveInput) {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          return false;
        }
        const result = saveFecha(stateRef.current, input);
        if (!result.state) {
          showToast(result.error || "No se pudo guardar la fecha");
          return false;
        }
        commit(result.state);
        showToast(input.id ? "Fecha actualizada" : "Fecha guardada");
        return true;
      },
      deleteFecha(id: string) {
        if (!isAdmin) return false;
        const current = stateRef.current;
        if (current.events.length <= 1) {
          showToast("Dejá al menos una fecha");
          return false;
        }
        if (!current.events.some((event) => event.id === id)) {
          showToast("No encontramos esa fecha. Actualizá la pantalla e intentá de nuevo.");
          return false;
        }
        const next = deleteFecha(current, id);
        if (!next) {
          showToast("No se pudo eliminar la fecha");
          return false;
        }
        commit(next);
        showToast("Fecha eliminada");
        return true;
      },
      saveWhatsapp(url: string) {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          return false;
        }
        const result = saveWhatsapp(stateRef.current, url);
        if (!result.state) {
          showToast(result.error || "No se pudo guardar el canal");
          return false;
        }
        commit(result.state);
        showToast("Canal oficial actualizado");
        return true;
      },
      saveBoatClass(input: ClassSaveInput) {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          return false;
        }
        const result = saveBoatClass(stateRef.current, input);
        if (!result.state) {
          showToast(result.error || "No se pudo guardar la clase");
          return false;
        }
        commit(result.state);
        showToast(input.original ? "Clase actualizada" : "Clase guardada");
        return true;
      },
      deleteBoatClass(name: string) {
        if (!isAdmin) return false;
        const current = stateRef.current;
        if (boatClasses(current).length <= 1) {
          showToast("Debe quedar al menos una clase");
          return false;
        }
        if (!boatClasses(current).some((item) => item.name === name)) {
          showToast("No encontramos esa clase");
          return false;
        }
        const next = deleteBoatClass(current, name);
        if (!next) {
          showToast("No se pudo borrar la clase");
          return false;
        }
        commit(next);
        showToast("Clase eliminada");
        return true;
      },
      logoutCommission() {
        writeAdminSession(false);
        setIsAdmin(false);
        showToast("Sesión de comisión cerrada");
      },
      requestWhatsappFocus() {
        if (!isAdmin) {
          showToast("PIN de comisión requerido");
          setTab("carga");
          return;
        }
        setWhatsappFocus((current) => current + 1);
      }
    };
    // commit y showToast leen refs y setters estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, state, sync, tab, toast, whatsappFocus]);

  return <ChampionshipContext.Provider value={value}>{children}</ChampionshipContext.Provider>;
}
