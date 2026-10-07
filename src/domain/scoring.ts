import {
  defaultDiscardsAllowed,
  filteredSailors,
  sameBoatClass,
  sailorFechas,
  sailorsInFecha
} from "./model";
import { canonicalScoreCell, normalizeScoreEntry } from "./score-entry";
import {
  NON_DISCARDABLE_PENALTIES,
  PENALTY_CODES,
  type ChampionshipState,
  type DateNet,
  type Fecha,
  type OverallSailor,
  type RankedSailor,
  type Sailor
} from "./types";

function scoreCellHasEntry(cell: string | null | undefined) {
  return canonicalScoreCell(cell) !== "";
}

/** Regatas de la fecha con al menos un resultado cargado (columna publicable en placa). */
export function raceIndexesWithResults(event: Pick<Fecha, "scores">) {
  const indexes = new Set<number>();
  for (const row of Object.values(event.scores || {})) {
    if (!Array.isArray(row)) continue;
    row.forEach((cell, index) => {
      if (scoreCellHasEntry(cell)) indexes.add(index);
    });
  }
  return [...indexes].sort((a, b) => a - b);
}

/** True cuando la comisión cargó al menos un resultado en esa fecha. */
export function fechaResultsStarted(event: Pick<Fecha, "scores">) {
  return raceIndexesWithResults(event).length > 0;
}

export function placaColumns(event: Fecha) {
  return raceIndexesWithResults(event).map((index) => `R${index + 1}`);
}

/** Texto publicado en placa/carga (p. ej. `DNC (desc.)`). */
export function formatRaceCellDisplay(
  raw: string | null | undefined,
  raceIndex: number,
  discardedRaceIndexes: number[]
) {
  const base = scoreCellHasEntry(raw) ? canonicalScoreCell(raw) : "DNC";
  const isDiscard = discardedRaceIndexes.includes(raceIndex);
  return isDiscard ? `${base} (desc.)` : base;
}

export function placaCellText(sailor: RankedSailor, raceIndex: number) {
  return formatRaceCellDisplay(sailor.raw[raceIndex], raceIndex, sailor.discardedRaceIndexes);
}

export function fechasWithResults(state: ChampionshipState) {
  return state.events.filter(fechaResultsStarted);
}

const emptyDateNet = (): DateNet => ({
  racePts: [],
  raw: [],
  net: 0,
  discarded: null,
  discardedRaceIndexes: []
});

export function fleetSize(state: ChampionshipState, cls: string, fechaKey: string | null) {
  let list = fechaKey ? sailorsInFecha(state, fechaKey) : state.sailors;
  if (cls && cls !== "ALL") list = list.filter((sailor) => sameBoatClass(sailor.boatClass, cls));
  return Math.max(1, list.length);
}

export function pointsFor(raw: string | null | undefined, fleet: number) {
  if (raw === null || raw === undefined || raw === "") return null;
  const code = normalizeScoreEntry(String(raw)) ?? String(raw).trim().toUpperCase();
  if ((PENALTY_CODES as readonly string[]).includes(code)) return fleet + 1;
  const position = parseInt(code, 10);
  return Number.isFinite(position) && position > 0 ? position : fleet + 1;
}

function isDiscardableScore(raw: string | null | undefined) {
  const code = normalizeScoreEntry(String(raw ?? "")) ?? String(raw ?? "").trim().toUpperCase();
  if (!code) return true;
  return !(NON_DISCARDABLE_PENALTIES as readonly string[]).includes(code);
}

export function effectiveDiscardsAllowed(event: { racesCount: number; discardsAllowed?: number }) {
  const racesCount = event.racesCount || 0;
  const max = Math.max(0, racesCount - 1);
  if (typeof event.discardsAllowed === "number" && Number.isFinite(event.discardsAllowed)) {
    return Math.min(Math.max(0, Math.floor(event.discardsAllowed)), max);
  }
  return Math.min(defaultDiscardsAllowed(racesCount), max);
}

function applySeriesDiscard(
  racePts: number[],
  raw: Array<string | null | undefined>,
  discardsAllowed: number
) {
  const total = racePts.reduce((sum, points) => sum + points, 0);
  const allowed = Math.max(0, Math.floor(discardsAllowed));
  if (!allowed || !racePts.length) {
    return { net: total, discarded: null as number | null, discardedRaceIndexes: [] as number[] };
  }

  const candidates: { index: number; points: number }[] = [];
  for (let index = 0; index < racePts.length; index += 1) {
    if (!isDiscardableScore(raw[index])) continue;
    candidates.push({ index, points: racePts[index] });
  }
  candidates.sort((a, b) => b.points - a.points);
  const picked = candidates.slice(0, allowed);
  if (!picked.length) return { net: total, discarded: null, discardedRaceIndexes: [] };
  const discarded = picked.reduce((sum, item) => sum + item.points, 0);
  const discardedRaceIndexes = picked.map((item) => item.index).sort((a, b) => a - b);
  return { net: total - discarded, discarded, discardedRaceIndexes };
}

/** RRS A8.1: mejores puntos de regata de cada timonel, de a uno. */
function compareBestRacePoints(a: number[], b: number[]): number {
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  const len = Math.max(left.length, right.length);
  for (let index = 0; index < len; index += 1) {
    const diff = (left[index] ?? Number.POSITIVE_INFINITY) - (right[index] ?? Number.POSITIVE_INFINITY);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** RRS A8.2: última regata (o fecha), luego la anterior. */
function compareLastRacePoints(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let offset = 0; offset < len; offset += 1) {
    const index = len - 1 - offset;
    const diff = (a[index] ?? Number.POSITIVE_INFINITY) - (b[index] ?? Number.POSITIVE_INFINITY);
    if (diff !== 0) return diff;
  }
  return 0;
}

function compareLowPointSeries(netA: number, racePtsA: number[], netB: number, racePtsB: number[]) {
  if (netA !== netB) return netA - netB;
  let tie = compareBestRacePoints(racePtsA, racePtsB);
  if (tie !== 0) return tie;
  tie = compareLastRacePoints(racePtsA, racePtsB);
  if (tie !== 0) return tie;
  return 0;
}

function compareOverall(netA: number, breakdownA: number[], netB: number, breakdownB: number[]) {
  if (netA !== netB) return netA - netB;
  let tie = compareBestRacePoints(breakdownA, breakdownB);
  if (tie !== 0) return tie;
  tie = compareLastRacePoints(breakdownA, breakdownB);
  if (tie !== 0) return tie;
  return 0;
}

export function dateNet(state: ChampionshipState, sailor: Sailor, fechaKey: string): DateNet {
  const event = state.events.find((item) => item.id === fechaKey);
  if (!event) return emptyDateNet();
  if (!fechaResultsStarted(event)) return emptyDateNet();
  const entered = sailorFechas(sailor, state.events).includes(fechaKey);
  if (!entered) return emptyDateNet();

  const activeIndexes = raceIndexesWithResults(event);
  const raw = event.scores[sailor.id] || [];
  const fleet = fleetSize(state, sailor.boatClass, fechaKey);
  const racePts = activeIndexes.map((index) => {
    const points = pointsFor(raw[index], fleet);
    return points === null ? fleet + 1 : points;
  });
  const rawActive = activeIndexes.map((index) => raw[index] ?? null);
  const { net, discarded, discardedRaceIndexes: discardPos } = applySeriesDiscard(
    racePts,
    rawActive,
    effectiveDiscardsAllowed({ ...event, racesCount: activeIndexes.length })
  );
  const discardedRaceIndexes = discardPos.map((pos) => activeIndexes[pos]);
  return { racePts, raw, net, discarded, discardedRaceIndexes };
}

function rankedForFechaInScope(state: ChampionshipState, fechaKey: string): RankedSailor[] {
  const event = state.events.find((item) => item.id === fechaKey);
  if (!event || !fechaResultsStarted(event)) return [];
  return filteredSailors(state, fechaKey)
    .map((sailor) => ({ ...sailor, ...dateNet(state, sailor, fechaKey) }))
    .sort(
      (a, b) => compareLowPointSeries(a.net, a.racePts, b.net, b.racePts) || a.sailNumber.localeCompare(b.sailNumber)
    );
}

export function rankedForFecha(state: ChampionshipState, fechaKey: string): RankedSailor[] {
  return rankedForFechaInScope(state, fechaKey);
}

function rankedOverallInScope(state: ChampionshipState): OverallSailor[] {
  const ids = fechasWithResults(state).map((event) => event.id);
  return filteredSailors(state, null)
    .map((sailor) => {
      const breakdown = ids.map((fechaKey) => dateNet(state, sailor, fechaKey).net);
      const net = breakdown.reduce((sum, points) => sum + points, 0);
      return { ...sailor, breakdown, net };
    })
    .sort((a, b) => compareOverall(a.net, a.breakdown, b.net, b.breakdown) || a.sailNumber.localeCompare(b.sailNumber));
}

export function rankedOverall(state: ChampionshipState): OverallSailor[] {
  return rankedOverallInScope(state);
}
