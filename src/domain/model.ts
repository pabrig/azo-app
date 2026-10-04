import { bundledDoc, defaultBoatClasses, DEFAULT_AVISOS, DEFAULT_WHATSAPP } from "./defaults";
import type { BoatClass, ChampionshipState, Fecha, Sailor } from "./types";

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
    scores: partial.scores || {}
  };
}

export function seedEvents(): Fecha[] {
  return [
    makeFecha({
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
        return { name: item, categories: known ? known.slice() : ["General"] };
      }
      if (!item || typeof item !== "object") return { name: "", categories: ["General"] };
      const record = item as { name?: unknown; categories?: unknown };
      const categories = Array.isArray(record.categories)
        ? record.categories.map((value) => String(value).trim()).filter(Boolean)
        : [];
      return {
        name: String(record.name || "").trim(),
        categories: categories.length ? categories : ["General"]
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
    classes: defaultBoatClasses()
  };
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
  return found?.categories.length ? found.categories : ["General"];
}

export function preferredClassName(state: ChampionshipState) {
  const names = classNames(state);
  if (names.includes("ILCA 6")) return "ILCA 6";
  return names[0] || "";
}

export function normalizeLoadedState(parsed: Partial<ChampionshipState> | null | undefined): ChampionshipState {
  if (!parsed) return defaultState();
  const events = migrateEvents(parsed.events);
  const fecha = events.some((event) => event.id === parsed.fecha) ? parsed.fecha || "" : events[0]?.id || "";
  return {
    ...defaultState(),
    ...parsed,
    sailors: Array.isArray(parsed.sailors) ? parsed.sailors : [],
    events,
    fecha,
    classFilter: typeof parsed.classFilter === "string" ? parsed.classFilter : "ALL",
    whatsappUrl: parsed.whatsappUrl || DEFAULT_WHATSAPP,
    classes: migrateClasses(parsed.classes)
  };
}
