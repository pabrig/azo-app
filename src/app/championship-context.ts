import { createContext, useContext } from "react";
import type { SyncMode, TabId } from "../domain/types";
import type { ChampionshipState, ClassSaveInput, FechaSaveInput, RegisterInput } from "../domain/types";

export type SyncStatus = { mode: SyncMode; label: string };

export type ToastState = { text: string; visible: boolean };

export type ChampionshipContextValue = {
  state: ChampionshipState;
  sync: SyncStatus;
  isAdmin: boolean;
  tab: TabId;
  toast: ToastState;
  showToast: (message: string) => void;
  setTab: (tab: TabId) => void;
  setFecha: (id: string) => void;
  setClassFilter: (className: string) => void;
  registerSailor: (input: RegisterInput) => void;
  deleteSailor: (id: string) => void;
  unlockAdmin: (pin: string) => boolean;
  addRace: () => void;
  removeRace: () => void;
  updateScore: (sailorId: string, raceIdx: number, value: string) => void;
  saveFecha: (input: FechaSaveInput) => boolean;
  deleteFecha: (id: string) => boolean;
  saveWhatsapp: (url: string) => boolean;
  saveBoatClass: (input: ClassSaveInput) => boolean;
  deleteBoatClass: (name: string) => boolean;
  logoutCommission: () => void;
  requestWhatsappFocus: () => void;
  whatsappFocus: number;
};

export const ChampionshipContext = createContext<ChampionshipContextValue | null>(null);

export function useChampionship() {
  const value = useContext(ChampionshipContext);
  if (!value) throw new Error("useChampionship tiene que usarse dentro del campeonato");
  return value;
}
