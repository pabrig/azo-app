import { defaultBoatClasses, DEFAULT_WHATSAPP } from "./defaults";
import { boatClasses, migrateClasses, migrateEvents, officialWhatsApp, seedEvents } from "./model";
import type { BoatClass, ChampionshipState, Fecha, Sailor } from "./types";

export type UnwrappedEvents = {
  events: Fecha[];
  whatsappUrl: string | null;
  classes: unknown;
};

export type ParsedCloud = {
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string | null;
  classes: BoatClass[] | null;
};

export function wrapEventsForCloud(state: ChampionshipState) {
  return JSON.stringify({
    fechas: state.events,
    whatsappUrl: officialWhatsApp(state),
    classes: boatClasses(state)
  });
}

export function unwrapEvents(raw: unknown): UnwrappedEvents {
  const empty: UnwrappedEvents = {
    events: seedEvents(),
    whatsappUrl: DEFAULT_WHATSAPP,
    classes: null
  };
  if (!raw) return empty;
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return empty;
    }
  }
  if (Array.isArray(value)) {
    return { events: migrateEvents(value), whatsappUrl: null, classes: null };
  }
  if (value && typeof value === "object" && "fechas" in value) {
    const record = value as { fechas?: unknown; whatsappUrl?: string; classes?: unknown };
    return {
      events: migrateEvents(record.fechas),
      whatsappUrl: record.whatsappUrl || null,
      classes: record.classes || null
    };
  }
  const record = value as { whatsappUrl?: string; classes?: unknown };
  return {
    events: migrateEvents(value),
    whatsappUrl: record.whatsappUrl || null,
    classes: record.classes || null
  };
}

export function cloudPayload(state: ChampionshipState) {
  return {
    sailors: JSON.stringify(state.sailors),
    events: wrapEventsForCloud(state)
  };
}

export function parseCloudDoc(doc: { sailors?: unknown; events?: unknown } | null | undefined): ParsedCloud {
  if (!doc) {
    return {
      sailors: [],
      events: seedEvents(),
      whatsappUrl: DEFAULT_WHATSAPP,
      classes: defaultBoatClasses()
    };
  }
  const sailors = typeof doc.sailors === "string" ? JSON.parse(doc.sailors || "[]") : doc.sailors || [];
  const unwrapped = unwrapEvents(doc.events);
  return {
    sailors: Array.isArray(sailors) ? sailors : [],
    events: unwrapped.events,
    whatsappUrl: unwrapped.whatsappUrl,
    classes: unwrapped.classes ? migrateClasses(unwrapped.classes) : null
  };
}

export function mergeRemote(state: ChampionshipState, row: unknown): ChampionshipState {
  const parsed = parseCloudDoc(row as { sailors?: unknown; events?: unknown } | null);
  const events = parsed.events ? migrateEvents(parsed.events) : state.events;
  const fecha = events.some((event) => event.id === state.fecha) ? state.fecha : events[0]?.id || "";
  return {
    ...state,
    sailors: Array.isArray(parsed.sailors) ? parsed.sailors : state.sailors,
    events,
    whatsappUrl: parsed.whatsappUrl || state.whatsappUrl,
    classes: parsed.classes && parsed.classes.length ? parsed.classes : state.classes,
    fecha
  };
}

export function remoteLooksEmpty(row: unknown) {
  const parsed = parseCloudDoc(row as { sailors?: unknown; events?: unknown } | null);
  return (
    !parsed.sailors.length &&
    migrateEvents(parsed.events).every((event) => !Object.keys(event.scores || {}).length)
  );
}

export function localHasResults(state: ChampionshipState) {
  return state.sailors.length > 0 || state.events.some((event) => Object.keys(event.scores || {}).length);
}
