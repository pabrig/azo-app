import { canonicalScoreCell } from "./score-entry";

export const DEFAULT_RACES = 3;
export const MAX_RACES = 6;

function scoreCellHasEntry(cell: string | null | undefined) {
  return canonicalScoreCell(cell) !== "";
}

/** Última columna con algún resultado (R1..Rn consecutivas para la grilla de carga). */
export function occupiedRaceCount(event: { scores?: Record<string, Array<string | null | undefined>> }) {
  let last = -1;
  for (const row of Object.values(event.scores || {})) {
    if (!Array.isArray(row)) continue;
    row.forEach((cell, index) => {
      if (scoreCellHasEntry(cell)) last = Math.max(last, index);
    });
  }
  return last + 1;
}

export function clampRacesCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_RACES;
  return Math.min(MAX_RACES, Math.max(1, Math.floor(value)));
}

export function sliceScoreBook(
  scores: Record<string, Array<string | null | undefined>> | undefined,
  racesCount: number
) {
  const next: Record<string, Array<string | null>> = {};
  Object.entries(scores || {}).forEach(([id, row]) => {
    next[id] = Array.isArray(row) ? row.slice(0, racesCount).map((cell) => cell ?? null) : [];
  });
  return next;
}

/**
 * Columnas de carga: grilla de 3 del campeonato, o las ya cargadas.
 * Después de 3+ con resultado, como máximo una columna vacía extra (la próxima).
 * No conserva columnas vacías de más (p. ej. 6 cuando solo hay 3 corridas).
 */
export function cargaRacesCount(event: {
  scores?: Record<string, Array<string | null | undefined>>;
  racesCount?: number;
}) {
  const occupied = occupiedRaceCount(event);
  const stored = event.racesCount && event.racesCount > 0 ? event.racesCount : 0;
  const planned = stored || DEFAULT_RACES;

  if (occupied === 0) return clampRacesCount(planned);

  if (occupied < DEFAULT_RACES) {
    return Math.max(occupied, Math.min(planned, DEFAULT_RACES));
  }

  if (planned > occupied + 1) return occupied;
  return Math.max(planned, occupied);
}

export function applyRacesCount<
  T extends {
    scores?: Record<string, Array<string | null | undefined>>;
    racesCount?: number;
    discardsAllowed?: number;
  }
>(event: T, racesCount: number): T {
  const count = clampRacesCount(racesCount);
  const scores = sliceScoreBook(event.scores, count);
  const maxDiscards = Math.max(0, count - 1);
  const current = event.discardsAllowed;
  const discardsAllowed =
    typeof current === "number" && Number.isFinite(current)
      ? Math.min(Math.max(0, Math.floor(current)), maxDiscards)
      : count >= DEFAULT_RACES
        ? 1
        : 0;
  return { ...event, racesCount: count, scores, discardsAllowed };
}

/** Repara un racesCount inflado (p. ej. 6 con solo 3 corridas) y recorta scores. */
export function normalizeFechaRaceSlots<
  T extends {
    scores?: Record<string, Array<string | null | undefined>>;
    racesCount?: number;
    discardsAllowed?: number;
  }
>(event: T): T {
  return applyRacesCount(event, cargaRacesCount(event));
}
