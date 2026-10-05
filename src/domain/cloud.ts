import { defaultBoatClasses, DEFAULT_WHATSAPP } from "./defaults";
import {
  boatClasses,
  defaultState,
  migrateClasses,
  migrateEvents,
  officialWhatsApp,
  personKey,
  sailorKey,
  seedEvents
} from "./model";
import type { BoatClass, ChampionshipState, Fecha, RemovedSailor, Sailor } from "./types";

export type UnwrappedEvents = {
  events: Fecha[];
  whatsappUrl: string | null;
  classes: unknown;
  classesAt: number;
  removedSailors: RemovedSailor[];
};

export type ParsedCloud = {
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string | null;
  classes: BoatClass[] | null;
  classesAt: number;
  removedSailors: RemovedSailor[];
};

type CloudRow = { sailors?: unknown; events?: unknown; data?: unknown };

export function wrapEventsForCloud(state: ChampionshipState) {
  const payload: {
    fechas: Fecha[];
    whatsappUrl: string;
    classes: BoatClass[];
    classesAt: number;
    removedSailors?: RemovedSailor[];
  } = {
    fechas: canonicalEvents(state.events),
    whatsappUrl: officialWhatsApp(state),
    classes: [...boatClasses(state)].sort((a, b) => a.name.localeCompare(b.name)),
    classesAt: state.classesAt || 0
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
    classesAt: 0,
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
    return { events: migrateEvents(value), whatsappUrl: null, classes: null, classesAt: 0, removedSailors: [] };
  }
  if (value && typeof value === "object" && "fechas" in value) {
    const record = value as {
      fechas?: unknown;
      whatsappUrl?: string;
      classes?: unknown;
      classesAt?: unknown;
      removedSailors?: unknown;
    };
    return {
      events: migrateEvents(record.fechas),
      whatsappUrl: record.whatsappUrl || null,
      classes: record.classes || null,
      classesAt: typeof record.classesAt === "number" ? record.classesAt : 0,
      removedSailors: parseRemoved(record.removedSailors)
    };
  }
  const record = value as { whatsappUrl?: string; classes?: unknown; classesAt?: unknown; removedSailors?: unknown };
  return {
    events: migrateEvents(value),
    whatsappUrl: record.whatsappUrl || null,
    classes: record.classes || null,
    classesAt: typeof record.classesAt === "number" ? record.classesAt : 0,
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
      classesAt: 0,
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
    classesAt: unwrapped.classesAt,
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
    classesAt: parsed.classesAt,
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
    ...mergeClassesMeta(state.classes, state.classesAt || 0, parsed.classes, parsed.classesAt || 0),
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
      const stamp = item as { sailNumber?: unknown; boatClass?: unknown; name?: unknown; at?: unknown };
      const sailNumber = String(stamp.sailNumber || "").trim().toUpperCase();
      const boatClass = String(stamp.boatClass || "").trim();
      const name = String(stamp.name || "").trim();
      const at = typeof stamp.at === "number" ? stamp.at : 0;
      if (!sailNumber || !boatClass || !at) return null;
      const parsed: RemovedSailor = { sailNumber, boatClass, at };
      if (name) parsed.name = name;
      return parsed;
    })
    .filter((item): item is RemovedSailor => Boolean(item));
}

function stampKey(stamp: RemovedSailor) {
  return stamp.name ? personKey({ name: stamp.name }) : sailorKey(stamp);
}

function shortHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Versiones viejas reusaban el id al pisar a otro timonel con la misma vela. */
function uniqueIds(sailors: Sailor[]) {
  const byId = new Map<string, Sailor[]>();
  for (const sailor of sailors) byId.set(sailor.id, [...(byId.get(sailor.id) || []), sailor]);
  return sailors.map((sailor) => {
    const group = byId.get(sailor.id) || [];
    if (group.length < 2) return sailor;
    const keeper = [...group].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || personKey(a).localeCompare(personKey(b))
    )[0];
    return sailor === keeper ? sailor : { ...sailor, id: `${sailor.id}-${shortHash(personKey(sailor))}` };
  });
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
    .sort((a, b) => personKey(a).localeCompare(personKey(b)) || a.id.localeCompare(b.id));
}

function canonicalRemoved(stamps: RemovedSailor[]) {
  return [...stamps]
    .map((stamp) => {
      const packed: RemovedSailor = {
        sailNumber: stamp.sailNumber.trim().toUpperCase(),
        boatClass: stamp.boatClass.trim(),
        at: stamp.at
      };
      if (stamp.name?.trim()) packed.name = stamp.name.trim();
      return packed;
    })
    .sort((a, b) => stampKey(a).localeCompare(stampKey(b)) || a.at - b.at);
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
    const key = stampKey(stamp);
    const previous = removed.get(key);
    if (!previous || stamp.at > previous.at) removed.set(key, stamp);
  }

  const byKey = new Map<string, Sailor>();
  const idMap = new Map<string, string>();
  const outranked = new Set<string>();

  function removalAt(sailor: Sailor) {
    const named = removed.get(personKey(sailor))?.at || 0;
    const legacy = removed.get(sailorKey(sailor))?.at || 0;
    return { named, legacy };
  }

  function consider(sailor: Sailor, incoming: boolean) {
    const key = personKey(sailor);
    const at = sailor.updatedAt || 0;
    const { named, legacy } = removalAt(sailor);
    if (Math.max(named, legacy) > at) return;
    if (named) outranked.add(key);
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
  for (const key of outranked) removed.delete(key);

  return {
    sailors: canonicalSailors(uniqueIds([...byKey.values()])),
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

/** La lista de clases completa gana por `classesAt`; no se re-unen borrados desde la nube. */
export function mergeClassesMeta(
  local: BoatClass[],
  localAt: number,
  remote: BoatClass[] | null,
  remoteAt: number
): { classes: BoatClass[]; classesAt: number } {
  const localList = local.length ? local : defaultBoatClasses();
  if (!remote?.length) {
    return { classes: localList, classesAt: Math.max(localAt, remoteAt) };
  }
  const remoteList = migrateClasses(remote);
  if (localAt > remoteAt) {
    return { classes: local.length ? local : defaultBoatClasses(), classesAt: localAt };
  }
  if (remoteAt > localAt) {
    return { classes: remoteList, classesAt: remoteAt };
  }
  const map = new Map<string, BoatClass>();
  for (const item of localList) map.set(item.name, item);
  for (const item of remoteList) map.set(item.name, item);
  return {
    classes: [...map.values()].sort((a, b) => a.name.localeCompare(b.name)),
    classesAt: Math.max(localAt, remoteAt)
  };
}
