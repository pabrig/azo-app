import { filteredSailors, sailorFechas, sailorsInFecha } from "./model";
import { PENALTY_CODES, type ChampionshipState, type DateNet, type OverallSailor, type RankedSailor, type Sailor } from "./types";

export function fleetSize(state: ChampionshipState, cls: string, fechaKey: string | null) {
  let list = fechaKey ? sailorsInFecha(state, fechaKey) : state.sailors;
  if (cls && cls !== "ALL") list = list.filter((sailor) => sailor.boatClass === cls);
  return Math.max(1, list.length);
}

export function pointsFor(raw: string | null | undefined, fleet: number) {
  if (raw === null || raw === undefined || raw === "") return null;
  const code = String(raw).toUpperCase();
  if ((PENALTY_CODES as readonly string[]).includes(code)) return fleet + 1;
  const position = parseInt(code, 10);
  return Number.isFinite(position) && position > 0 ? position : fleet + 1;
}

export function dateNet(state: ChampionshipState, sailor: Sailor, fechaKey: string): DateNet {
  const event = state.events.find((item) => item.id === fechaKey);
  if (!event) return { racePts: [], raw: [], net: 0, discarded: null };
  const entered = sailorFechas(sailor, state.events).includes(fechaKey);
  const raw = event.scores[sailor.id] || [];
  const fleet = fleetSize(state, sailor.boatClass, fechaKey);
  const racePts = Array.from({ length: event.racesCount }, (_, index) => {
    if (!entered) return fleet + 1;
    const points = pointsFor(raw[index], fleet);
    return points === null ? fleet + 1 : points;
  });
  let net = racePts.reduce((sum, points) => sum + points, 0);
  let discarded: number | null = null;
  if (event.racesCount >= 4 && racePts.length) {
    discarded = Math.max(...racePts);
    net -= discarded;
  }
  return { racePts, raw, net, discarded };
}

export function rankedForFecha(state: ChampionshipState, fechaKey: string): RankedSailor[] {
  return filteredSailors(state, fechaKey)
    .map((sailor) => ({ ...sailor, ...dateNet(state, sailor, fechaKey) }))
    .sort((a, b) => a.net - b.net || a.sailNumber.localeCompare(b.sailNumber));
}

export function rankedOverall(state: ChampionshipState): OverallSailor[] {
  const ids = state.events.map((event) => event.id);
  return filteredSailors(state, null)
    .map((sailor) => {
      const breakdown = ids.map((fechaKey) => dateNet(state, sailor, fechaKey).net);
      const net = breakdown.reduce((sum, points) => sum + points, 0);
      return { ...sailor, breakdown, net };
    })
    .sort((a, b) => a.net - b.net || a.sailNumber.localeCompare(b.sailNumber));
}
