import { normalizeClassCategories } from "./defaults";
import {
  alignSailorsToChampionshipFechas,
  allChampionshipFechaIds,
  boatClasses,
  fechaKey,
  makeFecha,
  officialWhatsApp,
  personKey,
  removalMatches,
  upcomingFechaId,
  uid
} from "./model";
import { applyRacesCount, clampRacesCount, MAX_RACES } from "./race-slots";
import { raceIndexesWithResults } from "./scoring";
import { normalizeScoreEntry } from "./score-entry";
import type {
  ChampionshipState,
  ClassSaveInput,
  Fecha,
  FechaSaveInput,
  RegisterInput,
  SailorSaveInput
} from "./types";

export function selectFecha(state: ChampionshipState, id: string): ChampionshipState {
  if (!state.events.some((event) => event.id === id)) return state;
  return { ...state, fecha: id };
}

export function selectClassFilter(state: ChampionshipState, classFilter: string): ChampionshipState {
  return { ...state, classFilter };
}

function optionalCelular(value: string | undefined) {
  return value?.trim() || undefined;
}

function optionalDni(value: string | undefined) {
  const trimmed = value?.trim() || "";
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  return digits || trimmed;
}

function contactFromInput(
  input: { celular?: string; dni?: string },
  existing?: { celular?: string; dni?: string }
) {
  const celular = optionalCelular(input.celular) || optionalCelular(existing?.celular);
  const dni = optionalDni(input.dni) || optionalDni(existing?.dni);
  return {
    ...(celular ? { celular } : {}),
    ...(dni ? { dni } : {})
  };
}

export function registerSailor(state: ChampionshipState, input: RegisterInput): { state: ChampionshipState; toast: string } {
  const sailNumber = input.sailNumber.trim().toUpperCase();
  const name = input.name.trim();
  const club = input.club.trim().toUpperCase() || "CNA";
  const person = { sailNumber, boatClass: input.boatClass, name };
  const removedSailors = state.removedSailors.filter((stamp) => !removalMatches(stamp, person));
  const updatedAt = Date.now();
  const championshipFechas = allChampionshipFechaIds(state.events);
  const focusFecha = upcomingFechaId(state.events);
  const existing = state.sailors.find((sailor) => personKey(sailor) === personKey(person));
  if (existing) {
    const contact = contactFromInput(input, existing);
    return {
      state: selectFecha(
        {
          ...state,
          removedSailors,
          sailors: state.sailors.map((sailor) =>
            sailor.id === existing.id
              ? {
                  ...sailor,
                  sailNumber,
                  boatClass: input.boatClass,
                  name,
                  category: input.category,
                  club,
                  celular: contact.celular,
                  dni: contact.dni,
                  fechas: championshipFechas,
                  updatedAt
                }
              : sailor
          )
        },
        focusFecha
      ),
      toast: `Inscripto al campeonato · ${championshipFechas.length} fecha(s)`
    };
  }
  const contact = contactFromInput(input);
  return {
    state: selectFecha(
      {
        ...state,
        removedSailors,
        sailors: [
          ...state.sailors,
          {
            id: uid(),
            sailNumber,
            boatClass: input.boatClass,
            name,
            category: input.category,
            club,
            ...contact,
            fechas: championshipFechas,
            updatedAt
          }
        ]
      },
      focusFecha
    ),
    toast: `Inscripción al campeonato · ${championshipFechas.length} fecha(s)`
  };
}

export function removeSailor(state: ChampionshipState, id: string): ChampionshipState {
  const sailor = state.sailors.find((item) => item.id === id);
  const removedSailors = sailor
    ? [
        ...state.removedSailors.filter(
          (stamp) => !(stamp.name && personKey({ name: stamp.name }) === personKey(sailor))
        ),
        {
          sailNumber: sailor.sailNumber,
          boatClass: sailor.boatClass,
          name: sailor.name,
          at: Math.max(Date.now(), (sailor.updatedAt || 0) + 1)
        }
      ]
    : state.removedSailors;
  return {
    ...state,
    removedSailors,
    sailors: state.sailors.filter((item) => item.id !== id),
    events: state.events.map((event) => {
      if (!event.scores[id]) return event;
      const scores = { ...event.scores };
      delete scores[id];
      return { ...event, scores };
    })
  };
}

export function updateSailor(
  state: ChampionshipState,
  input: SailorSaveInput
): { state?: ChampionshipState; error?: string } {
  const existing = state.sailors.find((sailor) => sailor.id === input.id);
  if (!existing) return { error: "No encontramos a esa persona" };
  const sailNumber = input.sailNumber.trim().toUpperCase();
  const name = input.name.trim();
  if (!sailNumber) return { error: "Falta el número de vela" };
  if (!name) return { error: "Falta el nombre" };
  const club = input.club.trim().toUpperCase() || "CNA";
  const contact = contactFromInput(input, existing);
  return {
    state: {
      ...state,
      sailors: state.sailors.map((sailor) =>
        sailor.id === existing.id
          ? {
              ...sailor,
              sailNumber,
              boatClass: input.boatClass,
              name,
              category: input.category,
              club,
              celular: contact.celular,
              dni: contact.dni,
              updatedAt: Date.now()
            }
          : sailor
      )
    }
  };
}

export function addRace(state: ChampionshipState): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  if (!current || clampRacesCount(current.racesCount) >= MAX_RACES) return state;
  return {
    ...state,
    events: state.events.map((event) => {
      if (event.id !== current.id) return event;
      const racesCount = Math.min(MAX_RACES, clampRacesCount(event.racesCount) + 1);
      const maxDiscards = Math.max(0, racesCount - 1);
      const discardsAllowed = Math.min(event.discardsAllowed ?? 0, maxDiscards);
      return { ...event, racesCount, discardsAllowed, updatedAt: Date.now() };
    })
  };
}

export function removeRace(state: ChampionshipState): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  const currentCount = current ? clampRacesCount(current.racesCount) : 0;
  if (!current || currentCount <= 1) return state;
  const racesCount = currentCount - 1;
  return {
    ...state,
    events: state.events.map((event) => {
      if (event.id !== current.id) return event;
      const scores: Fecha["scores"] = {};
      Object.keys(event.scores).forEach((sailorId) => {
        const row = event.scores[sailorId];
        scores[sailorId] = Array.isArray(row) ? row.slice(0, racesCount) : row;
      });
      const maxDiscards = Math.max(0, racesCount - 1);
      const discardsAllowed = Math.min(event.discardsAllowed ?? 0, maxDiscards);
      return { ...event, racesCount, discardsAllowed, scores, updatedAt: Date.now() };
    })
  };
}

export function setDiscardsAllowed(state: ChampionshipState, count: number): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  if (!current) return state;
  const raced = raceIndexesWithResults(current).length;
  const slots = clampRacesCount(current.racesCount);
  const max = Math.max(0, (raced || slots) - 1);
  const discardsAllowed = Math.min(Math.max(0, Math.floor(count)), max);
  if (discardsAllowed === current.discardsAllowed) return state;
  return {
    ...state,
    events: state.events.map((event) =>
      event.id === current.id ? { ...event, discardsAllowed, updatedAt: Date.now() } : event
    )
  };
}

export function updateScore(
  state: ChampionshipState,
  sailorId: string,
  raceIdx: number,
  value: string
): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  if (!current) return state;
  return {
    ...state,
    events: state.events.map((event) => {
      if (event.id !== current.id) return event;
      const previous = event.scores[sailorId] ? [...event.scores[sailorId]] : [];
      previous[raceIdx] =
        value === "" ? null : normalizeScoreEntry(value) ?? value.trim().toUpperCase();
      const now = Date.now();
      return {
        ...event,
        scores: { ...event.scores, [sailorId]: previous },
        scoreAt: { ...(event.scoreAt || {}), [sailorId]: now }
      };
    })
  };
}

export function saveFecha(
  state: ChampionshipState,
  input: FechaSaveInput
): { state?: ChampionshipState; error?: string } {
  const name = input.name.trim();
  if (!name) return { error: "Falta el nombre de la fecha" };
  if (!input.date) return { error: "Falta el día de la fecha" };
  const existing = state.events.find((event) => event.id === input.id);
  const others = state.events.filter((event) => event.id !== existing?.id);
  if (others.some((event) => fechaKey(event).split("|")[0] === fechaKey({ name, date: "" }).split("|")[0])) {
    return { error: `Ya existe una fecha llamada ${name}` };
  }
  if (others.some((event) => event.date === input.date)) {
    return { error: "Ya hay una fecha cargada para ese día" };
  }
  const racesCount = input.racesCount ?? existing?.racesCount;
  const drafted = makeFecha({
    ...(existing || {}),
    id: existing?.id || uid(),
    name,
    date: input.date,
    time: input.time,
    avisos: input.avisos.trim(),
    racesCount,
    discardsAllowed: input.discardsAllowed ?? existing?.discardsAllowed,
    ar: input.ar || existing?.ar,
    ir: input.ir || existing?.ir,
    updatedAt: Math.max(Date.now(), (existing?.updatedAt || 0) + 1)
  });
  const next = applyRacesCount(drafted, racesCount ?? drafted.racesCount);
  const events = existing
    ? state.events.map((event) =>
        event.id === next.id
          ? {
              ...existing,
              ...next,
              scores: next.scores,
              scoreAt: existing.scoreAt,
              racesCount: next.racesCount,
              discardsAllowed: next.discardsAllowed
            }
          : event
      )
    : [...state.events, next];
  events.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const removedFechas = state.removedFechas.filter((stamp) => stamp.id !== next.id);
  const nextState = { ...state, events, fecha: next.id, removedFechas };
  return {
    state: existing ? nextState : alignSailorsToChampionshipFechas(nextState)
  };
}

export function deleteFecha(state: ChampionshipState, id: string): ChampionshipState | null {
  if (state.events.length <= 1) return null;
  const target = state.events.find((event) => event.id === id);
  if (!target) return null;
  const at = Math.max(Date.now(), (target.updatedAt || 0) + 1);
  const events = state.events.filter((event) => event.id !== id);
  const remainingIds = allChampionshipFechaIds(events);
  const sailors = state.sailors.map((sailor) => ({
    ...sailor,
    fechas: remainingIds,
    updatedAt: at
  }));
  const fecha = state.fecha === id ? upcomingFechaId(events) : state.fecha;
  return {
    ...state,
    events,
    sailors,
    fecha,
    removedFechas: [...state.removedFechas.filter((stamp) => stamp.id !== id), { id, at }]
  };
}

export function saveWhatsapp(state: ChampionshipState, rawUrl: string): { state?: ChampionshipState; error?: string } {
  let url = rawUrl.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/chat\.whatsapp\.com/i.test(url)) {
    return { error: "Usá un link de grupo chat.whatsapp.com" };
  }
  return { state: { ...state, whatsappUrl: url, whatsappAt: Math.max(Date.now(), (state.whatsappAt || 0) + 1) } };
}

export function saveBoatClass(
  state: ChampionshipState,
  input: ClassSaveInput
): { state?: ChampionshipState; error?: string } {
  const name = input.name.trim();
  if (!name) return { error: "Falta el nombre de la clase" };
  const categories = normalizeClassCategories(input.categories);
  const list = (state.classes.length ? state.classes : boatClasses(state)).map((item) => ({
    ...item,
    categories: item.categories.slice()
  }));
  const duplicate = list.find(
    (item) => item.name.toLowerCase() === name.toLowerCase() && item.name !== input.original
  );
  if (duplicate) return { error: "Ya existe una clase con ese nombre" };
  let sailors = state.sailors;
  let classFilter = state.classFilter;
  if (input.original) {
    const index = list.findIndex((item) => item.name === input.original);
    if (index < 0) return { error: "No encontramos esa clase. Tocá Editar de nuevo." };
    list[index] = { name, categories };
    if (input.original !== name) {
      const renamedAt = Date.now();
      sailors = sailors.map((sailor) =>
        sailor.boatClass === input.original ? { ...sailor, boatClass: name, updatedAt: renamedAt } : sailor
      );
      if (classFilter === input.original) classFilter = name;
    }
  } else {
    list.push({ name, categories });
  }
  return { state: { ...state, classes: list, sailors, classFilter, classesAt: Date.now() } };
}

export function deleteBoatClass(state: ChampionshipState, name: string): ChampionshipState | null {
  const source = state.classes.length ? state.classes.map((item) => ({ ...item, categories: item.categories.slice() })) : boatClasses(state);
  if (source.length <= 1) return null;
  if (!source.some((item) => item.name === name)) return null;
  const nextClasses = source.filter((item) => item.name !== name);
  const fallbackClass = nextClasses[0]?.name || "General";
  const at = Date.now();
  const sailors = state.sailors.map((sailor) =>
    sailor.boatClass === name ? { ...sailor, boatClass: fallbackClass, updatedAt: at } : sailor
  );
  return {
    ...state,
    classes: nextClasses,
    sailors,
    classFilter: state.classFilter === name ? "ALL" : state.classFilter,
    classesAt: at
  };
}

export function storedSnapshot(state: ChampionshipState) {
  return {
    fecha: state.fecha,
    classFilter: state.classFilter,
    sailors: state.sailors,
    events: state.events,
    whatsappUrl: officialWhatsApp(state),
    classes: boatClasses(state),
    removedSailors: state.removedSailors,
    removedFechas: state.removedFechas,
    whatsappAt: state.whatsappAt,
    classesAt: state.classesAt
  };
}
