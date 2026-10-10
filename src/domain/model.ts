import {
  bundledDoc,
  DEFAULT_CLASS_CATEGORIES,
  defaultBoatClasses,
  DEFAULT_AVISOS,
  DEFAULT_WHATSAPP,
  migrateClassCategories
} from "./defaults";
import { canonicalBoatClassName, sameBoatClass } from "./class-names";
import { applyCanonicalClassNames } from "./migrate-championship";
import { clampRacesCount, sliceScoreBook } from "./race-slots";
import type { BoatClass, ChampionshipState, Fecha, RaceDoc, RemovedFecha, Sailor } from "./types";

export { canonicalBoatClassName, sameBoatClass } from "./class-names";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function formatDay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha local YYYY-MM-DD (inscripciones usan calendario del dispositivo). */
export function todayLocalIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Timoneles no pueden inscribirse si el día de regata ya pasó (mismo día aún permitido). */
export function isFechaRegistrationClosed(fecha: Fecha, todayIso = todayLocalIso()) {
  const day = fecha.date?.trim();
  if (!day) return false;
  return day < todayIso;
}

function sortEventsBySchedule(events: Fecha[]) {
  return [...events].sort(
    (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id.localeCompare(b.id)
  );
}

/** Próxima fecha del calendario (hoy incluido). Si todas pasaron, la más reciente. */
export function upcomingFechaId(events: Fecha[], todayIso = todayLocalIso()) {
  const sorted = sortEventsBySchedule(events);
  if (!sorted.length) return "";
  const nextOpen = sorted.find((event) => !isFechaRegistrationClosed(event, todayIso));
  return nextOpen?.id || sorted[sorted.length - 1].id;
}

/** Al abrir la app: foco en la próxima fecha (el timonel puede cambiarla en la sesión). */
export function resolveActiveFecha(state: ChampionshipState, todayIso = todayLocalIso()) {
  return upcomingFechaId(state.events, todayIso);
}

/** Descarte por defecto del campeonato (3+ regatas → 1, como placa oficial). */
export function defaultDiscardsAllowed(racesCount: number) {
  return racesCount >= 3 ? 1 : 0;
}

function resolveDiscardsAllowed(partial: Partial<Fecha>, racesCount: number) {
  const max = Math.max(0, racesCount - 1);
  if (typeof partial.discardsAllowed === "number" && Number.isFinite(partial.discardsAllowed)) {
    return Math.min(Math.max(0, Math.floor(partial.discardsAllowed)), max);
  }
  return defaultDiscardsAllowed(racesCount);
}

export function makeFecha(partial: Partial<Fecha> = {}): Fecha {
  const racesCount = clampRacesCount(partial.racesCount);
  const scores = sliceScoreBook(partial.scores || {}, racesCount);
  return {
    id: partial.id || uid(),
    name: partial.name || "Nueva fecha",
    date: partial.date || "",
    time: partial.time || "12:00",
    avisos: partial.avisos || DEFAULT_AVISOS,
    ar: bundledDoc(partial.ar, "ar"),
    ir: bundledDoc(partial.ir, "ir"),
    racesCount,
    discardsAllowed: resolveDiscardsAllowed(partial, racesCount),
    scores,
    ...(partial.updatedAt ? { updatedAt: partial.updatedAt } : {}),
    ...(partial.scoreAt && Object.keys(partial.scoreAt).length ? { scoreAt: partial.scoreAt } : {})
  };
}

/** Id fijo: cada celular nuevo arranca con la misma Fecha 1 en lugar de crear otra. */
export const SEED_FECHA_ID = "f1";

export function seedEvents(): Fecha[] {
  return [
    makeFecha({
      id: SEED_FECHA_ID,
      name: "Fecha 1",
      date: "2026-10-03",
      time: "12:00",
      avisos: DEFAULT_AVISOS
    })
  ];
}

export function migrateEvents(raw: unknown): Fecha[] {
  if (Array.isArray(raw)) return raw.map((event) => makeFecha(event as Partial<Fecha>));
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, Partial<Fecha>>).map(([id, event], index) =>
      makeFecha({
        ...event,
        id,
        name: event.name || `Fecha ${index + 1}`,
        date: event.date || (id === "f1" ? "2026-10-03" : "")
      })
    );
  }
  return seedEvents();
}

export function migrateClasses(raw: unknown): BoatClass[] {
  if (!Array.isArray(raw) || !raw.length) return defaultBoatClasses();
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const known = DEFAULT_BOAT_CLASSES_LOOKUP(item);
        return {
          name: item,
          categories: migrateClassCategories(known ? known.slice() : [...DEFAULT_CLASS_CATEGORIES])
        };
      }
      if (!item || typeof item !== "object") return { name: "", categories: [...DEFAULT_CLASS_CATEGORIES] };
      const record = item as { name?: unknown; categories?: unknown };
      const categories = Array.isArray(record.categories)
        ? record.categories.map((value) => String(value).trim()).filter(Boolean)
        : [];
      return {
        name: String(record.name || "").trim(),
        categories: migrateClassCategories(categories)
      };
    })
    .filter((item) => item.name);
}

function DEFAULT_BOAT_CLASSES_LOOKUP(name: string) {
  const known = defaultBoatClasses().find((item) => item.name === name);
  return known?.categories;
}

export function defaultState(): ChampionshipState {
  const events = seedEvents();
  return {
    fecha: upcomingFechaId(events),
    classFilter: "ALL",
    sailors: [],
    events,
    whatsappUrl: DEFAULT_WHATSAPP,
    classes: defaultBoatClasses(),
    removedSailors: [],
    removedFechas: [],
    whatsappAt: 0,
    classesAt: 0
  };
}

export function fechaKey(fecha: { name: string; date: string }) {
  return `${normalizeName(fecha.name)}|${fecha.date}`;
}

export function suggestNextFechaName(events: Fecha[]) {
  const used = new Set(events.map((event) => normalizeName(event.name)));
  let index = events.length + 1;
  while (used.has(normalizeName(`Fecha ${index}`))) index += 1;
  return `Fecha ${index}`;
}

function cloneScoreRow(row: Array<string | null> | undefined) {
  return row ? [...row] : [];
}

function fillScoreRow(
  base: Array<string | null> | undefined,
  incoming: Array<string | null> | undefined,
  overwrite: boolean
) {
  const row = cloneScoreRow(base);
  (incoming || []).forEach((cell, index) => {
    if (cell == null || cell === "") {
      if (row[index] === undefined) row[index] = null;
      return;
    }
    if (overwrite || row[index] == null || row[index] === "") row[index] = cell;
  });
  return row;
}

/** Une resultados por timonel: gana el `scoreAt` más reciente (correcciones de comisión). */
export function mergeScoreBooks(
  leftScores: Fecha["scores"] | undefined,
  leftAt: Record<string, number> | undefined,
  rightScores: Fecha["scores"] | undefined,
  rightAt: Record<string, number> | undefined,
  mapId: (id: string) => string = (id) => id
): { scores: Fecha["scores"]; scoreAt: Record<string, number> } {
  type Side = { row?: Array<string | null>; at: number };
  const sides = new Map<string, { left: Side; right: Side }>();

  const take = (
    scores: Fecha["scores"] | undefined,
    atMap: Record<string, number> | undefined,
    which: "left" | "right"
  ) => {
    Object.entries(scores || {}).forEach(([id, row]) => {
      const key = mapId(id);
      const at = atMap?.[id] || atMap?.[key] || 0;
      const entry = sides.get(key) || { left: { at: 0 }, right: { at: 0 } };
      if (!entry[which].row || at >= entry[which].at) {
        entry[which] = { row, at };
      }
      sides.set(key, entry);
    });
  };

  take(leftScores, leftAt, "left");
  take(rightScores, rightAt, "right");

  const scores: Fecha["scores"] = {};
  const scoreAt: Record<string, number> = {};
  for (const [key, { left, right }] of sides) {
    if ((right.at || 0) > (left.at || 0)) {
      if (right.row) scores[key] = cloneScoreRow(right.row);
      if (right.at) scoreAt[key] = right.at;
    } else if ((left.at || 0) > (right.at || 0)) {
      if (left.row) scores[key] = cloneScoreRow(left.row);
      if (left.at) scoreAt[key] = left.at;
    } else {
      scores[key] = fillScoreRow(left.row, right.row, true);
      const at = Math.max(left.at || 0, right.at || 0);
      if (at) scoreAt[key] = at;
    }
  }
  return { scores, scoreAt };
}

/** Un PDF subido no se pierde si el otro lado solo trae el nombre/href. */
export function mergeRaceDoc(winner: RaceDoc | undefined, loser: RaceDoc | undefined): RaceDoc {
  if (winner?.dataUrl) return winner;
  if (loser?.dataUrl) {
    return {
      ...loser,
      ...winner,
      dataUrl: loser.dataUrl,
      name: winner?.name || loser.name
    };
  }
  return winner || loser || { name: "" };
}

function mergeFechaRecords(a: Fecha, b: Fecha): Fecha {
  const aAt = a.updatedAt || 0;
  const bAt = b.updatedAt || 0;
  let winner = a;
  let loser = b;
  if (bAt > aAt) {
    winner = b;
    loser = a;
  } else if (bAt < aAt) {
    winner = a;
    loser = b;
  } else if (a.id === SEED_FECHA_ID && b.id !== SEED_FECHA_ID) {
    winner = a;
    loser = b;
  } else if (b.id === SEED_FECHA_ID && a.id !== SEED_FECHA_ID) {
    winner = b;
    loser = a;
  }
  const { scores, scoreAt } = mergeScoreBooks(loser.scores, loser.scoreAt, winner.scores, winner.scoreAt);
  return {
    ...loser,
    ...winner,
    ar: mergeRaceDoc(winner.ar, loser.ar),
    ir: mergeRaceDoc(winner.ir, loser.ir),
    scores,
    racesCount: winner.racesCount,
    discardsAllowed: winner.discardsAllowed,
    ...(Object.keys(scoreAt).length ? { scoreAt } : {})
  };
}

/** Varias copias de “Fecha 1” con el mismo día (p. ej. por sync) quedan en una sola. */
export function compactDuplicateFechas(events: Fecha[]) {
  const byKey = new Map<string, Fecha>();
  for (const event of events) {
    const key = fechaKey(event);
    const previous = byKey.get(key);
    byKey.set(key, previous ? mergeFechaRecords(previous, event) : event);
  }
  return [...byKey.values()].sort(
    (a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id.localeCompare(b.id)
  );
}

export function applyRemovedFechas(events: Fecha[], removed: RemovedFecha[]) {
  const atById = new Map(removed.map((stamp) => [stamp.id, stamp.at]));
  return events.filter((event) => {
    const at = atById.get(event.id);
    if (!at) return true;
    return at <= (event.updatedAt || 0);
  });
}

export function sailorKey(sailor: { sailNumber: string; boatClass: string }) {
  return `${sailor.sailNumber.trim().toUpperCase()}|${sailor.boatClass.trim()}`;
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Vela, clase y club se repiten entre timoneles: solo el nombre y apellido identifica a la persona. */
export function personKey(sailor: { name: string }) {
  return normalizeName(sailor.name);
}

/** Las bajas viejas no guardaban el nombre y alcanzan a toda la vela de esa clase. */
export function removalMatches(
  stamp: { sailNumber: string; boatClass: string; name?: string },
  sailor: { sailNumber: string; boatClass: string; name: string }
) {
  return stamp.name ? personKey({ name: stamp.name }) === personKey(sailor) : sailorKey(stamp) === sailorKey(sailor);
}

export function boatClasses(state: ChampionshipState): BoatClass[] {
  return state.classes.length ? state.classes : defaultBoatClasses();
}

export function classNames(state: ChampionshipState) {
  return boatClasses(state).map((item) => item.name);
}

export function effectiveClassFilter(state: ChampionshipState) {
  if (state.classFilter === "ALL") return "ALL";
  const filter = canonicalBoatClassName(state.classFilter);
  const names = classNames(state);
  if (!names.some((name) => sameBoatClass(name, filter))) return "ALL";
  return names.find((name) => sameBoatClass(name, filter)) || filter;
}

export function currentEvent(state: ChampionshipState): Fecha | null {
  return state.events.find((event) => event.id === state.fecha) || state.events[0] || null;
}

export function fechaLabel(events: Fecha[], id: string) {
  const event = events.find((item) => item.id === id);
  if (!event) return id;
  return event.date ? `${event.name} (${formatDay(event.date)})` : event.name;
}

/** Todas las fechas del campeonato (orden del calendario). */
export function allChampionshipFechaIds(events: Fecha[]) {
  return events.map((event) => event.id);
}

/** Inscripción al campeonato completo: todo competidor participa en cada fecha del calendario. */
export function sailorFechas(_sailor: Sailor, events: Fecha[]) {
  return allChampionshipFechaIds(events);
}

function sailorFechasStored(sailor: Sailor) {
  return Array.isArray(sailor.fechas) ? sailor.fechas : [];
}

/** Persiste en cada timonel la lista completa de fechas (sync y listados). */
export function alignSailorsToChampionshipFechas(state: ChampionshipState): ChampionshipState {
  const allIds = allChampionshipFechaIds(state.events);
  if (!allIds.length || !state.sailors.length) return state;
  let changed = false;
  const sailors = state.sailors.map((sailor) => {
    const stored = sailorFechasStored(sailor);
    const complete = stored.length === allIds.length && allIds.every((id) => stored.includes(id));
    if (complete) return sailor;
    changed = true;
    return { ...sailor, fechas: allIds };
  });
  return changed ? { ...state, sailors } : state;
}

export function sailorsInFecha(state: ChampionshipState, fechaKey: string) {
  return state.sailors.filter((sailor) => sailorFechas(sailor, state.events).includes(fechaKey));
}

export function filteredSailors(state: ChampionshipState, fechaKey: string | null) {
  const list = fechaKey ? sailorsInFecha(state, fechaKey) : state.sailors.slice();
  const filter = effectiveClassFilter(state);
  if (filter === "ALL") return list;
  return list.filter((sailor) => sameBoatClass(sailor.boatClass, filter));
}

export function officialWhatsApp(state: ChampionshipState) {
  return (state.whatsappUrl || DEFAULT_WHATSAPP).trim();
}

export function categoriesForClass(state: ChampionshipState, className: string) {
  const found = boatClasses(state).find((item) => sameBoatClass(item.name, className));
  return found?.categories.length ? found.categories : [...DEFAULT_CLASS_CATEGORIES];
}

export function preferredClassName(state: ChampionshipState) {
  const names = classNames(state);
  if (names.includes("ILCA 6")) return "ILCA 6";
  return names[0] || "";
}

/** Placa y ranking: nunca “Todas”; si el estado global es ALL, usa la clase preferida. */
export function resultsClassFilter(state: ChampionshipState) {
  const filter = effectiveClassFilter(state);
  if (filter === "ALL") return preferredClassName(state);
  return filter;
}

export function normalizeLoadedState(parsed: Partial<ChampionshipState> | null | undefined): ChampionshipState {
  if (!parsed) return defaultState();
  const removedFechas = Array.isArray(parsed.removedFechas) ? parsed.removedFechas : [];
  const events = compactDuplicateFechas(applyRemovedFechas(migrateEvents(parsed.events), removedFechas));
  const draft = applyCanonicalClassNames({
    ...defaultState(),
    ...parsed,
    sailors: Array.isArray(parsed.sailors) ? parsed.sailors : [],
    events,
    fecha: events.some((event) => event.id === parsed.fecha) ? parsed.fecha || "" : upcomingFechaId(events),
    classFilter: typeof parsed.classFilter === "string" ? parsed.classFilter : "ALL",
    whatsappUrl: parsed.whatsappUrl || DEFAULT_WHATSAPP,
    classes: migrateClasses(parsed.classes),
    removedSailors: Array.isArray(parsed.removedSailors) ? parsed.removedSailors : [],
    removedFechas,
    whatsappAt: typeof parsed.whatsappAt === "number" ? parsed.whatsappAt : 0,
    classesAt: typeof parsed.classesAt === "number" ? parsed.classesAt : 0
  });
  return { ...draft, fecha: resolveActiveFecha(draft) };
}
