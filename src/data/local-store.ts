import { normalizeLoadedState } from "../domain/model";
import { storedSnapshot } from "../domain/mutations";
import type { ChampionshipState } from "../domain/types";

export const STORAGE_KEY = "cna_vela_state_v2";
export const LEGACY_KEY = "cna_vela_state_v1";
export const ADMIN_KEY = "cna_vela_admin";

export function loadLocalState(): ChampionshipState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return withFechaQuery(normalizeLoadedState(null));
    return withFechaQuery(normalizeLoadedState(JSON.parse(raw)));
  } catch {
    return withFechaQuery(normalizeLoadedState(null));
  }
}

function withFechaQuery(state: ChampionshipState): ChampionshipState {
  const fechaParam = new URLSearchParams(location.search).get("fecha");
  if (fechaParam && state.events.some((event) => event.id === fechaParam)) {
    return { ...state, fecha: fechaParam };
  }
  return state;
}

export function persistLocal(state: ChampionshipState): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSnapshot(state)));
    return null;
  } catch {
    return "Sin espacio para guardar un documento tan grande";
  }
}

export function clearLocalState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export function readAdminSession() {
  return sessionStorage.getItem(ADMIN_KEY) === "1";
}

export function writeAdminSession(active: boolean) {
  if (active) sessionStorage.setItem(ADMIN_KEY, "1");
  else sessionStorage.removeItem(ADMIN_KEY);
}
