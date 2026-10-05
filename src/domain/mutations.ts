import { boatClasses, makeFecha, officialWhatsApp, sailorFechas, sailorKey, uid } from "./model";
import type { ChampionshipState, ClassSaveInput, Fecha, FechaSaveInput, RegisterInput } from "./types";

export function selectFecha(state: ChampionshipState, id: string): ChampionshipState {
  if (!state.events.some((event) => event.id === id)) return state;
  return { ...state, fecha: id };
}

export function selectClassFilter(state: ChampionshipState, classFilter: string): ChampionshipState {
  return { ...state, classFilter };
}

export function registerSailor(state: ChampionshipState, input: RegisterInput): { state: ChampionshipState; toast: string } {
  const sailNumber = input.sailNumber.trim().toUpperCase();
  const name = input.name.trim();
  const club = input.club.trim().toUpperCase() || "CNA";
  const removedSailors = state.removedSailors.filter(
    (stamp) => sailorKey(stamp) !== sailorKey({ sailNumber, boatClass: input.boatClass })
  );
  const updatedAt = Date.now();
  const existing = state.sailors.find(
    (sailor) => sailor.sailNumber === sailNumber && sailor.boatClass === input.boatClass
  );
  if (existing) {
    const fechas = sailorFechas(existing, state.events);
    const nextFechas = fechas.includes(input.fecha) ? fechas.slice() : [...fechas, input.fecha];
    return {
      state: selectFecha(
        {
          ...state,
          removedSailors,
          sailors: state.sailors.map((sailor) =>
            sailor.id === existing.id
              ? {
                  ...sailor,
                  name,
                  category: input.category,
                  club,
                  fechas: nextFechas,
                  updatedAt
                }
              : sailor
          )
        },
        input.fecha
      ),
      toast: `Inscripto en ${label(state, input.fecha)}`
    };
  }
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
            fechas: [input.fecha],
            updatedAt
          }
        ]
      },
      input.fecha
    ),
    toast: `Inscripción confirmada · ${label(state, input.fecha)}`
  };
}

function label(state: ChampionshipState, id: string) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return id;
  if (!event.date) return event.name;
  const [year, month, day] = event.date.split("-");
  return `${event.name} (${day}/${month}/${year})`;
}

export function removeSailor(state: ChampionshipState, id: string): ChampionshipState {
  const sailor = state.sailors.find((item) => item.id === id);
  const removedSailors = sailor
    ? [
        ...state.removedSailors.filter((stamp) => sailorKey(stamp) !== sailorKey(sailor)),
        { sailNumber: sailor.sailNumber, boatClass: sailor.boatClass, at: Date.now() }
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

export function addRace(state: ChampionshipState): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  if (!current) return state;
  return {
    ...state,
    events: state.events.map((event) =>
      event.id === current.id ? { ...event, racesCount: event.racesCount + 1 } : event
    )
  };
}

export function removeRace(state: ChampionshipState): ChampionshipState {
  const current = state.events.find((event) => event.id === state.fecha) || state.events[0];
  if (!current || current.racesCount <= 1) return state;
  const racesCount = current.racesCount - 1;
  return {
    ...state,
    events: state.events.map((event) => {
      if (event.id !== current.id) return event;
      const scores: Fecha["scores"] = {};
      Object.keys(event.scores).forEach((sailorId) => {
        const row = event.scores[sailorId];
        scores[sailorId] = Array.isArray(row) ? row.slice(0, racesCount) : row;
      });
      return { ...event, racesCount, scores };
    })
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
      previous[raceIdx] = value === "" ? null : value;
      return { ...event, scores: { ...event.scores, [sailorId]: previous } };
    })
  };
}

export function saveFecha(state: ChampionshipState, input: FechaSaveInput): ChampionshipState {
  const existing = state.events.find((event) => event.id === input.id);
  const next = makeFecha({
    ...(existing || {}),
    id: input.id || uid(),
    name: input.name.trim(),
    date: input.date,
    time: input.time,
    avisos: input.avisos.trim(),
    ar: input.ar || existing?.ar,
    ir: input.ir || existing?.ir
  });
  const events = existing
    ? state.events.map((event) =>
        event.id === next.id
          ? { ...existing, ...next, scores: existing.scores, racesCount: existing.racesCount }
          : event
      )
    : [...state.events, next];
  events.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return { ...state, events, fecha: next.id };
}

export function deleteFecha(state: ChampionshipState, id: string): ChampionshipState | null {
  if (state.events.length <= 1) return null;
  const events = state.events.filter((event) => event.id !== id);
  const sailors = state.sailors.map((sailor) => ({
    ...sailor,
    fechas: sailorFechas(sailor, state.events).filter((fechaId) => fechaId !== id)
  }));
  const fecha = state.fecha === id ? events[0].id : state.fecha;
  return { ...state, events, sailors, fecha };
}

export function saveWhatsapp(state: ChampionshipState, rawUrl: string): { state?: ChampionshipState; error?: string } {
  let url = rawUrl.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/chat\.whatsapp\.com/i.test(url)) {
    return { error: "Usá un link de grupo chat.whatsapp.com" };
  }
  return { state: { ...state, whatsappUrl: url } };
}

export function saveBoatClass(
  state: ChampionshipState,
  input: ClassSaveInput
): { state?: ChampionshipState; error?: string } {
  const name = input.name.trim();
  if (!name) return { error: "Falta el nombre de la clase" };
  const categories = input.categories.length ? input.categories : ["General"];
  const list = boatClasses(state).map((item) => ({ ...item, categories: item.categories.slice() }));
  const duplicate = list.find(
    (item) => item.name.toLowerCase() === name.toLowerCase() && item.name !== input.original
  );
  if (duplicate) return { error: "Ya existe una clase con ese nombre" };
  let sailors = state.sailors;
  let classFilter = state.classFilter;
  if (input.original) {
    const index = list.findIndex((item) => item.name === input.original);
    if (index >= 0) {
      list[index] = { name, categories };
      if (input.original !== name) {
        sailors = sailors.map((sailor) =>
          sailor.boatClass === input.original ? { ...sailor, boatClass: name } : sailor
        );
        if (classFilter === input.original) classFilter = name;
      }
    } else {
      list.push({ name, categories });
    }
  } else {
    list.push({ name, categories });
  }
  return { state: { ...state, classes: list, sailors, classFilter } };
}

export function deleteBoatClass(state: ChampionshipState, name: string): ChampionshipState | null {
  const source = boatClasses(state);
  if (source.length <= 1) return null;
  return {
    ...state,
    classes: source.filter((item) => item.name !== name),
    classFilter: state.classFilter === name ? "ALL" : state.classFilter
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
    removedSailors: state.removedSailors
  };
}
