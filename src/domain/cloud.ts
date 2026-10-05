import { defaultBoatClasses, DEFAULT_WHATSAPP } from "./defaults";
import {
  boatClasses,
  defaultState,
  migrateClasses,
  migrateEvents,
  officialWhatsApp,
  sailorKey,
  seedEvents
} from "./model";
import type { BoatClass, ChampionshipState, Fecha, RemovedSailor, Sailor } from "./types";

export type UnwrappedEvents = {
  events: Fecha[];
  whatsappUrl: string | null;
  classes: unknown;
  removedSailors: RemovedSailor[];
};

export type ParsedCloud = {
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string | null;
  classes: BoatClass[] | null;
  removedSailors: RemovedSailor[];
};

type CloudRow = { sailors?: unknown; events?: unknown; data?: unknown };

export function wrapEventsForCloud(state: ChampionshipState) {
  const payload: {
    fechas: Fecha[];
    whatsappUrl: string;
    classes: BoatClass[];
    removedSailors?: RemovedSailor[];
  } = {
    fechas: canonicalEvents(state.events),
    whatsappUrl: officialWhatsApp(state),
    classes: [...boatClasses(state)].sort((a, b) => a.name.localeCompare(b.name))
  };
  const removedSailors = canonicalRemoved(state.removedSailors);
  if (removedSailors.length) payload.removedSailors = removedSailors;
  return JSON.stringify(payload);
}

export function unwrapEvents(raw: unknown): UnwrappedEvents {
  const empty: UnwrappedEvents = {
    events: seedEvents(),
    whatsappUrl: DEFAULT_WHATSAPP,
    classes: null,
    removedSailors: []
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
    return { events: migrateEvents(value), whatsappUrl: null, classes: null, removedSailors: [] };
  }
  if (value && typeof value === "object" && "fechas" in value) {
    const record = value as {
      fechas?: unknown;
      whatsappUrl?: string;
      classes?: unknown;
      removedSailors?: unknown;
    };
    return {
      events: migrateEvents(record.fechas),
      whatsappUrl: record.whatsappUrl || null,
      classes: record.classes || null,
      removedSailors: parseRemoved(record.removedSailors)
    };
  }
  const record = value as { whatsappUrl?: string; classes?: unknown; removedSailors?: unknown };
  return {
    events: migrateEvents(value),
    whatsappUrl: record.whatsappUrl || null,
    classes: record.classes || null,
    removedSailors: parseRemoved(record.removedSailors)
  };
}

export function cloudPayload(state: ChampionshipState) {
  return {
    sailors: JSON.stringify(canonicalSailors(state.sailors)),
    events: wrapEventsForCloud(state)
  };
}

export function parseCloudDoc(doc: CloudRow | null | undefined): ParsedCloud {
  const row = asCloudRow(doc);
  if (!row) {
    return {
      sailors: [],
      events: seedEvents(),
      whatsappUrl: DEFAULT_WHATSAPP,
      classes: defaultBoatClasses(),
      removedSailors: []
    };
  }
  const sailors = typeof row.sailors === "string" ? JSON.parse(row.sailors || "[]") : row.sailors || [];
  const unwrapped = unwrapEvents(row.events);
  return {
    sailors: Array.isArray(sailors) ? sailors : [],
    events: unwrapped.events,
    whatsappUrl: unwrapped.whatsappUrl,
    classes: unwrapped.classes ? migrateClasses(unwrapped.classes) : null,
    removedSailors: unwrapped.removedSailors
  };
}

export function cloudView(row: unknown): ChampionshipState {
  const parsed = parseCloudDoc(asCloudRow(row));
  const events = parsed.events.length ? parsed.events : seedEvents();
  return {
    ...defaultState(),
    sailors: parsed.sailors,
    events,
    whatsappUrl: parsed.whatsappUrl || DEFAULT_WHATSAPP,
    classes: parsed.classes && parsed.classes.length ? parsed.classes : defaultBoatClasses(),
    removedSailors: parsed.removedSailors,
    fecha: events[0]?.id || ""
  };
}

export function syncFingerprint(state: ChampionshipState) {
  const payload = cloudPayload(state);
  return `${payload.sailors}\n${payload.events}`;
}

/** Une inscripciones de dos dispositivos. Una lista más corta no borra competidores. */
export function mergeRemote(state: ChampionshipState, row: unknown): ChampionshipState {
  const parsed = parseCloudDoc(asCloudRow(row));
  const { sailors, removedSailors, idMap } = mergeSailors(
    state.sailors,
    parsed.sailors,
    state.removedSailors,
    parsed.removedSailors
  );
  const events = mergeEvents(state.events, parsed.events, idMap);
  const fecha = events.some((event) => event.id === state.fecha) ? state.fecha : events[0]?.id || "";
  return {
    ...state,
    sailors,
    removedSailors,
    events,
    whatsappUrl: parsed.whatsappUrl || state.whatsappUrl,
    classes: mergeClasses(state.classes, parsed.classes),
    fecha
  };
}

function asCloudRow(row: unknown): CloudRow | null {
  if (!row || typeof row !== "object") return null;
  const record = row as CloudRow;
  if (record.sailors == null && record.events == null && record.data && typeof record.data === "object") {
    return record.data as CloudRow;
  }
  return record;
}

function parseRemoved(raw: unknown): RemovedSailor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const stamp = item as { sailNumber?: unknown; boatClass?: unknown; at?: unknown };
      const sailNumber = String(stamp.sailNumber || "").trim().toUpperCase();
      const boatClass = String(stamp.boatClass || "").trim();
      const at = typeof stamp.at === "number" ? stamp.at : 0;
      if (!sailNumber || !boatClass || !at) return null;
      return { sailNumber, boatClass, at };
    })
    .filter((item): item is RemovedSailor => Boolean(item));
}

function canonicalSailors(sailors: Sailor[]) {
  return [...sailors]
    .map((sailor) => {
      const packed: Sailor = {
        id: sailor.id,
        sailNumber: sailor.sailNumber.trim().toUpperCase(),
        boatClass: sailor.boatClass.trim(),
        name: sailor.name,
        category: sailor.category,
        club: sailor.club
      };
      if (sailor.fechas?.length) packed.fechas = [...sailor.fechas].sort();
      if (sailor.updatedAt) packed.updatedAt = sailor.updatedAt;
      return packed;
    })
    .sort((a, b) => sailorKey(a).localeCompare(sailorKey(b)) || a.id.localeCompare(b.id));
}

function canonicalRemoved(stamps: RemovedSailor[]) {
  return [...stamps]
    .map((stamp) => ({
      sailNumber: stamp.sailNumber.trim().toUpperCase(),
      boatClass: stamp.boatClass.trim(),
      at: stamp.at
    }))
    .sort((a, b) => sailorKey(a).localeCompare(sailorKey(b)));
}

function canonicalEvents(events: Fecha[]) {
  return [...events]
    .map((event) => ({
      ...event,
      scores: Object.fromEntries(Object.entries(event.scores || {}).sort(([a], [b]) => a.localeCompare(b)))
    }))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id.localeCompare(b.id));
}

function mergeSailors(
  local: Sailor[],
  remote: Sailor[],
  localRemoved: RemovedSailor[],
  remoteRemoved: RemovedSailor[]
) {
  const removed = new Map<string, RemovedSailor>();
  for (const stamp of [...localRemoved, ...remoteRemoved]) {
    const key = sailorKey(stamp);
    const previous = removed.get(key);
    if (!previous || stamp.at > previous.at) {
      removed.set(key, {
        sailNumber: stamp.sailNumber.trim().toUpperCase(),
        boatClass: stamp.boatClass.trim(),
        at: stamp.at
      });
    }
  }

  const byKey = new Map<string, Sailor>();
  const idMap = new Map<string, string>();

  function consider(sailor: Sailor, incoming: boolean) {
    const key = sailorKey(sailor);
    const stamp = removed.get(key);
    const at = sailor.updatedAt || 0;
    if (stamp && stamp.at > at) return;
    if (stamp && at >= stamp.at) removed.delete(key);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...sailor, sailNumber: sailor.sailNumber.trim().toUpperCase() });
      return;
    }
    const existingAt = existing.updatedAt || 0;
    const incomingWins = at > existingAt || (at === existingAt && incoming);
    const winner = incomingWins ? sailor : existing;
    const loser = incomingWins ? existing : sailor;
    if (loser.id !== winner.id) idMap.set(loser.id, winner.id);
    const fechas = [...new Set([...(existing.fechas || []), ...(sailor.fechas || [])])];
    byKey.set(key, {
      ...winner,
      sailNumber: winner.sailNumber.trim().toUpperCase(),
      fechas: fechas.length ? fechas : winner.fechas,
      updatedAt: Math.max(existingAt, at) || undefined
    });
  }

  for (const sailor of local) consider(sailor, false);
  for (const sailor of remote) consider(sailor, true);

  return {
    sailors: canonicalSailors([...byKey.values()]),
    removedSailors: canonicalRemoved([...removed.values()]),
    idMap
  };
}

function canonId(id: string, idMap: Map<string, string>) {
  let next = id;
  const seen = new Set<string>();
  while (idMap.has(next) && !seen.has(next)) {
    seen.add(next);
    next = idMap.get(next) || next;
  }
  return next;
}

function mergeScoreRows(
  base: Array<string | null> | undefined,
  incoming: Array<string | null> | undefined,
  overwrite: boolean
) {
  const row = base ? [...base] : [];
  (incoming || []).forEach((cell, index) => {
    if (cell == null || cell === "") {
      if (row[index] === undefined) row[index] = null;
      return;
    }
    if (overwrite || row[index] == null || row[index] === "") row[index] = cell;
  });
  return row;
}

function mergeScores(
  local: Fecha["scores"],
  remote: Fecha["scores"],
  idMap: Map<string, string>
) {
  const out: Fecha["scores"] = {};
  const put = (id: string, row: Array<string | null> | undefined, overwrite: boolean) => {
    if (!row) return;
    const key = canonId(id, idMap);
    out[key] = mergeScoreRows(out[key], row, overwrite);
  };
  Object.entries(local || {}).forEach(([id, row]) => put(id, row, false));
  Object.entries(remote || {}).forEach(([id, row]) => put(id, row, true));
  return out;
}

function mergeEvents(local: Fecha[], remote: Fecha[], idMap: Map<string, string>) {
  const map = new Map<string, Fecha>();
  for (const event of local) {
    map.set(event.id, { ...event, scores: mergeScores(event.scores, {}, idMap) });
  }
  for (const event of remote) {
    const previous = map.get(event.id);
    if (!previous) {
      map.set(event.id, { ...event, scores: mergeScores({}, event.scores, idMap) });
      continue;
    }
    map.set(event.id, {
      ...previous,
      ...event,
      racesCount: Math.max(previous.racesCount || 0, event.racesCount || 0),
      scores: mergeScores(previous.scores, event.scores, idMap)
    });
  }
  return canonicalEvents([...map.values()]);
}

function mergeClasses(local: BoatClass[], remote: BoatClass[] | null) {
  if (!remote?.length) return local.length ? local : defaultBoatClasses();
  const map = new Map<string, BoatClass>();
  for (const item of local) map.set(item.name, item);
  for (const item of remote) map.set(item.name, item);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
