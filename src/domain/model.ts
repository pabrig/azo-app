import {
  bundledDoc,
  DEFAULT_CLASS_CATEGORIES,
  defaultBoatClasses,
  DEFAULT_AVISOS,
  DEFAULT_WHATSAPP,
  migrateClassCategories
} from "./defaults";
import type { BoatClass, ChampionshipState, Fecha, RemovedFecha, Sailor } from "./types";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function formatDay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function makeFecha(partial: Partial<Fecha> = {}): Fecha {
  return {
    id: partial.id || uid(),
    name: partial.name || "Nueva fecha",
    date: partial.date || "",
    time: partial.time || "12:00",
    avisos: partial.avisos || DEFAULT_AVISOS,
    ar: bundledDoc(partial.ar, "ar"),
    ir: bundledDoc(partial.ir, "ir"),
    racesCount: partial.racesCount || 3,
    scores: partial.scores || {},
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
    fecha: events[0].id,
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
  const scoreAt = { ...(loser.scoreAt || {}), ...(winner.scoreAt || {}) };
  return {
    ...winner,
    racesCount: Math.max(winner.racesCount || 0, loser.racesCount || 0),
    scores: { ...loser.scores, ...winner.scores },
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
  if (state.classFilter !== "ALL" && !classNames(state).includes(state.classFilter)) return "ALL";
  return state.classFilter;
}

export function currentEvent(state: ChampionshipState): Fecha | null {
  return state.events.find((event) => event.id === state.fecha) || state.events[0] || null;
}

export function fechaLabel(events: Fecha[], id: string) {
  const event = events.find((item) => item.id === id);
  if (!event) return id;
  return event.date ? `${event.name} (${formatDay(event.date)})` : event.name;
}

export function sailorFechas(sailor: Sailor, events: Fecha[]) {
  if (Array.isArray(sailor.fechas) && sailor.fechas.length) return sailor.fechas;
  return events[0] ? [events[0].id] : [];
}

export function sailorsInFecha(state: ChampionshipState, fechaKey: string) {
  return state.sailors.filter((sailor) => sailorFechas(sailor, state.events).includes(fechaKey));
}

export function filteredSailors(state: ChampionshipState, fechaKey: string | null) {
  const list = fechaKey ? sailorsInFecha(state, fechaKey) : state.sailors.slice();
  const filter = effectiveClassFilter(state);
  if (filter === "ALL") return list;
  return list.filter((sailor) => sailor.boatClass === filter);
}

export function officialWhatsApp(state: ChampionshipState) {
  return (state.whatsappUrl || DEFAULT_WHATSAPP).trim();
}

export function categoriesForClass(state: ChampionshipState, className: string) {
  const found = boatClasses(state).find((item) => item.name === className);
  return found?.categories.length ? found.categories : [...DEFAULT_CLASS_CATEGORIES];
}

export function preferredClassName(state: ChampionshipState) {
  const names = classNames(state);
  if (names.includes("ILCA 6")) return "ILCA 6";
  return names[0] || "";
}

export function normalizeLoadedState(parsed: Partial<ChampionshipState> | null | undefined): ChampionshipState {
  if (!parsed) return defaultState();
  const removedFechas = Array.isArray(parsed.removedFechas) ? parsed.removedFechas : [];
  const events = compactDuplicateFechas(applyRemovedFechas(migrateEvents(parsed.events), removedFechas));
  const fecha = events.some((event) => event.id === parsed.fecha) ? parsed.fecha || "" : events[0]?.id || "";
  return {
    ...defaultState(),
    ...parsed,
    sailors: Array.isArray(parsed.sailors) ? parsed.sailors : [],
    events,
    fecha,
    classFilter: typeof parsed.classFilter === "string" ? parsed.classFilter : "ALL",
    whatsappUrl: parsed.whatsappUrl || DEFAULT_WHATSAPP,
    classes: migrateClasses(parsed.classes),
    removedSailors: Array.isArray(parsed.removedSailors) ? parsed.removedSailors : [],
    removedFechas,
    whatsappAt: typeof parsed.whatsappAt === "number" ? parsed.whatsappAt : 0,
    classesAt: typeof parsed.classesAt === "number" ? parsed.classesAt : 0
  };
}
