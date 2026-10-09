import { canonicalBoatClassName } from "./class-names";
import { clampRacesCount } from "./race-slots";
import type { BoatClass, ChampionshipState, Fecha, RemovedSailor, Sailor } from "./types";

function defaultDiscardsAllowed(racesCount: number) {
  return racesCount >= 3 ? 1 : 0;
}

export { canonicalBoatClassName, sameBoatClass } from "./class-names";

function mergeClassDefinitions(classes: BoatClass[]): BoatClass[] {
  const byName = new Map<string, BoatClass>();
  for (const item of classes) {
    const name = canonicalBoatClassName(item.name);
    if (!name) continue;
    const prev = byName.get(name);
    if (!prev) {
      byName.set(name, { name, categories: [...item.categories] });
      continue;
    }
    byName.set(name, {
      name,
      categories: [...new Set([...prev.categories, ...item.categories])]
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function migrateSailorClasses(sailors: Sailor[], report: string[]) {
  let changed = false;
  const next = sailors.map((sailor) => {
    const boatClass = canonicalBoatClassName(sailor.boatClass);
    if (boatClass !== sailor.boatClass) {
      changed = true;
      report.push(`Timonel ${sailor.name}: clase "${sailor.boatClass}" → "${boatClass}"`);
      return { ...sailor, boatClass };
    }
    return sailor;
  });
  return { sailors: next, changed };
}

function migrateRemovedClasses(stamps: RemovedSailor[]) {
  return stamps.map((stamp) => ({
    ...stamp,
    boatClass: canonicalBoatClassName(stamp.boatClass)
  }));
}

function migrateFechaDiscards(events: Fecha[], report: string[]) {
  let changed = false;
  const next = events.map((event) => {
    const racesCount = clampRacesCount(event.racesCount);
    const current = event.discardsAllowed ?? defaultDiscardsAllowed(racesCount);
    const target = defaultDiscardsAllowed(racesCount);
    if (racesCount >= 3 && current < target) {
      changed = true;
      report.push(`${event.name}: descartes ${current} → ${target} (${racesCount} regatas)`);
      return { ...event, racesCount, discardsAllowed: target, updatedAt: Date.now() };
    }
    return event;
  });
  return { events: next, changed };
}

/** Persiste ILCA 6 / ILCA 7 en memoria (carga/sync). No altera classesAt (evita pisar LWW de comisión). */
export function applyCanonicalClassNames(state: ChampionshipState): ChampionshipState {
  const { state: next, changed } = normalizeChampionshipClasses(state);
  return changed ? next : state;
}

export function normalizeChampionshipClasses(state: ChampionshipState): {
  state: ChampionshipState;
  changed: boolean;
  report: string[];
} {
  const report: string[] = [];
  let changed = false;

  const mergedClasses = mergeClassDefinitions(state.classes.length ? state.classes : []);
  const classFilter =
    state.classFilter === "ALL" ? "ALL" : canonicalBoatClassName(state.classFilter);

  const sailorsResult = migrateSailorClasses(state.sailors, report);
  changed ||= sailorsResult.changed;

  const removedSailors = migrateRemovedClasses(state.removedSailors);
  if (JSON.stringify(removedSailors) !== JSON.stringify(state.removedSailors)) changed = true;

  if (JSON.stringify(mergedClasses) !== JSON.stringify(state.classes)) changed = true;
  if (classFilter !== state.classFilter) changed = true;

  if (!report.length && changed) report.push("Clases normalizadas a ILCA 6 / ILCA 7.");
  if (!changed) report.push("Sin cambios de migración.");

  return {
    changed,
    report,
    state: {
      ...state,
      classes: mergedClasses,
      sailors: sailorsResult.sailors,
      removedSailors,
      events: state.events,
      classFilter
    }
  };
}

/** Migración explícita (script Appwrite). */
export function migrateChampionshipState(state: ChampionshipState): { state: ChampionshipState; report: string[] } {
  const classes = normalizeChampionshipClasses(state);
  const discards = migrateFechaDiscards(classes.state.events, classes.report);
  const changed = classes.changed || discards.changed;
  return {
    state: {
      ...classes.state,
      events: discards.events,
      classesAt: changed ? Date.now() : classes.state.classesAt
    },
    report: classes.report
  };
}
