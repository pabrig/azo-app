import { defaultBoatClasses, DEFAULT_WHATSAPP } from "./defaults";
import { applyCanonicalClassNames } from "./migrate-championship";
import {
  applyRemovedFechas,
  boatClasses,
  compactDuplicateFechas,
  defaultState,
  mergeRaceDoc,
  mergeScoreBooks,
  migrateClasses,
  migrateEvents,
  officialWhatsApp,
  personKey,
  sailorKey,
  seedEvents
} from "./model";
import { clampRacesCount, sliceScoreBook } from "./race-slots";
import type { BoatClass, ChampionshipState, Fecha, RemovedFecha, RemovedSailor, Sailor } from "./types";

export type UnwrappedEvents = {
  events: Fecha[];
  whatsappUrl: string | null;
  whatsappAt: number;
  classes: unknown;
  classesAt: number;
  removedSailors: RemovedSailor[];
  removedFechas: RemovedFecha[];
};

export type ParsedCloud = {
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string | null;
  whatsappAt: number;
  classes: BoatClass[] | null;
  classesAt: number;
  removedSailors: RemovedSailor[];
  removedFechas: RemovedFecha[];
};

type CloudRow = { sailors?: unknown; events?: unknown; data?: unknown };

export function wrapEventsForCloud(state: ChampionshipState) {
  const payload: {
    fechas: Fecha[];
    whatsappUrl: string;
    whatsappAt: number;
    classes: BoatClass[];
    classesAt: number;
    removedSailors?: RemovedSailor[];
    removedFechas?: RemovedFecha[];
  } = {
    fechas: canonicalEvents(state.events),
    whatsappUrl: officialWhatsApp(state),
    whatsappAt: state.whatsappAt || 0,
    classes: [...boatClasses(state)].sort((a, b) => a.name.localeCompare(b.name)),
    classesAt: state.classesAt || 0
  };
  const removedSailors = canonicalRemoved(state.removedSailors);
  if (removedSailors.length) payload.removedSailors = removedSailors;
  const removedFechas = canonicalRemovedFechas(state.removedFechas);
  if (removedFechas.length) payload.removedFechas = removedFechas;
  return JSON.stringify(payload);
}

export function unwrapEvents(raw: unknown): UnwrappedEvents {
  const empty: UnwrappedEvents = {
    events: seedEvents(),
    whatsappUrl: DEFAULT_WHATSAPP,
    whatsappAt: 0,
    classes: null,
    classesAt: 0,
    removedSailors: [],
    removedFechas: []
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
    return {
      events: migrateEvents(value),
      whatsappUrl: null,
      whatsappAt: 0,
      classes: null,
      classesAt: 0,
      removedSailors: [],
      removedFechas: []
    };
  }
  if (value && typeof value === "object" && "fechas" in value) {
    const record = value as {
      fechas?: unknown;
      whatsappUrl?: string;
      whatsappAt?: unknown;
      classes?: unknown;
      classesAt?: unknown;
      removedSailors?: unknown;
      removedFechas?: unknown;
    };
    return {
      events: migrateEvents(record.fechas),
      whatsappUrl: record.whatsappUrl || null,
      whatsappAt: typeof record.whatsappAt === "number" ? record.whatsappAt : 0,
      classes: record.classes || null,
      classesAt: typeof record.classesAt === "number" ? record.classesAt : 0,
      removedSailors: parseRemoved(record.removedSailors),
      removedFechas: parseRemovedFechas(record.removedFechas)
    };
  }
  const record = value as {
    whatsappUrl?: string;
    whatsappAt?: unknown;
    classes?: unknown;
    classesAt?: unknown;
    removedSailors?: unknown;
    removedFechas?: unknown;
  };
  return {
    events: migrateEvents(value),
    whatsappUrl: record.whatsappUrl || null,
    whatsappAt: typeof record.whatsappAt === "number" ? record.whatsappAt : 0,
    classes: record.classes || null,
    classesAt: typeof record.classesAt === "number" ? record.classesAt : 0,
    removedSailors: parseRemoved(record.removedSailors),
    removedFechas: parseRemovedFechas(record.removedFechas)
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
      whatsappAt: 0,
      classes: defaultBoatClasses(),
      classesAt: 0,
      removedSailors: [],
      removedFechas: []
    };
  }
  const sailors = typeof row.sailors === "string" ? JSON.parse(row.sailors || "[]") : row.sailors || [];
  const unwrapped = unwrapEvents(row.events);
  const removedFechas = mergeRemovedFechas([], unwrapped.removedFechas);
  const events = finalizeEvents(unwrapped.events.length ? unwrapped.events : seedEvents(), removedFechas);
  return {
    sailors: Array.isArray(sailors) ? sailors : [],
    events,
    whatsappUrl: unwrapped.whatsappUrl,
    whatsappAt: unwrapped.whatsappAt,
    classes: unwrapped.classes ? migrateClasses(unwrapped.classes) : null,
    classesAt: unwrapped.classesAt,
    removedSailors: unwrapped.removedSailors,
    removedFechas
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
    whatsappAt: parsed.whatsappAt || 0,
    classes: parsed.classes && parsed.classes.length ? parsed.classes : defaultBoatClasses(),
    removedSailors: parsed.removedSailors,
    removedFechas: parsed.removedFechas,
    classesAt: parsed.classesAt,
    fecha: events[0]?.id || ""
  };
}

export function syncFingerprint(state: ChampionshipState) {
  const payload = cloudPayload(state);
  return `${payload.sailors}\n${payload.events}`;
}

function pickWhatsapp(
  localUrl: string | undefined,
  localAt: number,
  remoteUrl: string | null | undefined,
  remoteAt: number
) {
  if (remoteAt > localAt) {
    return { whatsappUrl: remoteUrl || localUrl || DEFAULT_WHATSAPP, whatsappAt: remoteAt };
  }
  if (localAt > remoteAt) {
    return { whatsappUrl: localUrl || remoteUrl || DEFAULT_WHATSAPP, whatsappAt: localAt };
  }
  return {
    whatsappUrl: remoteUrl || localUrl || DEFAULT_WHATSAPP,
    whatsappAt: Math.max(localAt, remoteAt)
  };
}

/** Realtime a veces manda el row sin `events`; no hay que rehidratar Fecha 1 semilla. */
export function hasCloudChampionship(row: unknown): boolean {
  const parsed = asCloudRow(row);
  if (!parsed) return false;
  return parsed.events != null && parsed.events !== "";
}

/** Une inscripciones de dos dispositivos. Una lista más corta no borra competidores. */
export function mergeRemote(state: ChampionshipState, row: unknown): ChampionshipState {
  if (!hasCloudChampionship(row)) return state;
  const parsed = parseCloudDoc(asCloudRow(row));
  const { sailors, removedSailors, idMap } = mergeSailors(
    state.sailors,
    parsed.sailors,
    state.removedSailors,
    parsed.removedSailors
  );
  const removedFechas = mergeRemovedFechas(state.removedFechas, parsed.removedFechas);
  const events = mergeEvents(state.events, parsed.events, idMap, removedFechas);
  const fecha = events.some((event) => event.id === state.fecha) ? state.fecha : events[0]?.id || "";
  return applyCanonicalClassNames({
    ...state,
    sailors,
    removedSailors,
    removedFechas,
    events,
    ...pickWhatsapp(state.whatsappUrl, state.whatsappAt || 0, parsed.whatsappUrl, parsed.whatsappAt || 0),
    ...mergeClassesMeta(state.classes, state.classesAt || 0, parsed.classes, parsed.classesAt || 0),
    fecha
  });
}

function asCloudRow(row: unknown): CloudRow | null {
  if (!row || typeof row !== "object") return null;
  const record = row as CloudRow;
  if (record.sailors == null && record.events == null && record.data && typeof record.data === "object") {
    return record.data as CloudRow;
  }
  return record;
}

function parseRemovedFechas(raw: unknown): RemovedFecha[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const stamp = item as { id?: unknown; at?: unknown };
      const id = String(stamp.id || "").trim();
      const at = typeof stamp.at === "number" ? stamp.at : 0;
      if (!id || !at) return null;
      return { id, at };
    })
    .filter((item): item is RemovedFecha => Boolean(item));
}

function canonicalRemovedFechas(stamps: RemovedFecha[]) {
  return mergeRemovedFechas([], stamps);
}

function mergeRemovedFechas(local: RemovedFecha[], remote: RemovedFecha[]) {
  const map = new Map<string, RemovedFecha>();
  for (const stamp of [...local, ...remote]) {
    const previous = map.get(stamp.id);
    if (!previous || stamp.at > previous.at) map.set(stamp.id, stamp);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id) || a.at - b.at);
}

function finalizeEvents(events: Fecha[], removedFechas: RemovedFecha[]) {
  return compactDuplicateFechas(applyRemovedFechas(events, removedFechas));
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
      const celular = sailor.celular?.trim();
      const dni = sailor.dni?.trim();
      if (celular) packed.celular = celular;
      if (dni) packed.dni = dni;
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
    .map((event) => {
      const racesCount = clampRacesCount(event.racesCount);
      const scores = sliceScoreBook(event.scores, racesCount);
      return {
        ...event,
        racesCount,
        discardsAllowed:
          typeof event.discardsAllowed === "number" && Number.isFinite(event.discardsAllowed)
            ? Math.min(Math.max(0, event.discardsAllowed), Math.max(0, racesCount - 1))
            : racesCount >= 3
              ? 1
              : 0,
        scores: Object.fromEntries(Object.entries(scores).sort(([a], [b]) => a.localeCompare(b)))
      };
    })
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
    const celular = winner.celular?.trim() || loser.celular?.trim();
    const dni = winner.dni?.trim() || loser.dni?.trim();
    byKey.set(key, {
      ...winner,
      sailNumber: winner.sailNumber.trim().toUpperCase(),
      fechas: fechas.length ? fechas : winner.fechas,
      celular: celular || undefined,
      dni: dni || undefined,
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

function withMergedScores(
  event: Fecha,
  local: Fecha | undefined,
  remote: Fecha | undefined,
  idMap: Map<string, string>
): Fecha {
  const book = mergeScoreBooks(
    local?.scores,
    local?.scoreAt,
    remote?.scores,
    remote?.scoreAt,
    (id) => canonId(id, idMap)
  );
  return {
    ...event,
    scores: book.scores,
    ...(Object.keys(book.scoreAt).length ? { scoreAt: book.scoreAt } : {})
  };
}

function mergeEvents(
  local: Fecha[],
  remote: Fecha[],
  idMap: Map<string, string>,
  removedFechas: RemovedFecha[]
) {
  const map = new Map<string, Fecha>();
  for (const event of local) {
    map.set(event.id, withMergedScores(event, event, undefined, idMap));
  }
  for (const event of remote) {
    const previous = map.get(event.id);
    if (!previous) {
      map.set(event.id, withMergedScores(event, undefined, event, idMap));
      continue;
    }
    const localAt = previous.updatedAt || 0;
    const remoteAt = event.updatedAt || 0;
    const winner = remoteAt > localAt ? event : previous;
    const loser = winner === event ? previous : event;
    const merged = withMergedScores({ ...loser, ...winner }, previous, event, idMap);
    const racesCount = clampRacesCount(winner.racesCount);
    map.set(event.id, {
      ...merged,
      ar: mergeRaceDoc(winner.ar, loser.ar),
      ir: mergeRaceDoc(winner.ir, loser.ir),
      racesCount,
      discardsAllowed:
        typeof winner.discardsAllowed === "number" && Number.isFinite(winner.discardsAllowed)
          ? Math.min(Math.max(0, winner.discardsAllowed), Math.max(0, racesCount - 1))
          : merged.discardsAllowed
    });
  }
  return finalizeEvents([...map.values()], removedFechas);
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
