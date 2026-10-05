import { describe, expect, it } from "vitest";
import { cloudPayload, cloudView, mergeRemote, syncFingerprint } from "./cloud";
import { defaultState, migrateClasses, migrateEvents } from "./model";
import { dateNet, fleetSize, pointsFor, rankedForFecha } from "./scoring";
import { registerSailor, removeSailor, saveFecha, updateScore } from "./mutations";
import type { ChampionshipState, Sailor } from "./types";

describe("puntaje low point", () => {
  it("cuenta un código de penalización como flota + 1", () => {
    expect(pointsFor("DNF", 10)).toBe(11);
    expect(pointsFor("3", 10)).toBe(3);
    expect(pointsFor("", 10)).toBeNull();
  });

  it("descarta el peor resultado cuando hay 4 o más regatas", () => {
    const state = defaultState();
    const fechaId = state.events[0].id;
    const sailor: Sailor = {
      id: "s1",
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fechas: [fechaId]
    };
    state.sailors = [sailor, { ...sailor, id: "s2", sailNumber: "ARG 2" }];
    state.events[0].racesCount = 4;
    state.events[0].scores.s1 = ["1", "2", "8", "3"];
    const net = dateNet(state, sailor, fechaId);
    expect(fleetSize(state, "ILCA 6", fechaId)).toBe(2);
    expect(net.discarded).toBe(8);
    expect(net.net).toBe(6);
  });

  it("ordena la fecha por puntaje neto", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state = {
      ...state,
      sailors: [
        {
          id: "b",
          sailNumber: "ARG 2",
          boatClass: "ILCA 6",
          name: "Beto",
          category: "General",
          club: "CNA",
          fechas: [fechaId]
        },
        {
          id: "a",
          sailNumber: "ARG 1",
          boatClass: "ILCA 6",
          name: "Ana",
          category: "General",
          club: "CNA",
          fechas: [fechaId]
        }
      ]
    };
    state = updateScore(state, "a", 0, "1");
    state = updateScore({ ...state, fecha: fechaId }, "b", 0, "2");
    const ranked = rankedForFecha(state, fechaId);
    expect(ranked.map((sailor) => sailor.id)).toEqual(["a", "b"]);
  });
});

describe("fechas y clases heredadas", () => {
  it("migra clases que estaban guardadas como texto", () => {
    const classes = migrateClasses(["ILCA 6", "Optimist"]);
    expect(classes[0].categories).toContain("Junior");
    expect(classes[1]).toEqual({ name: "Optimist", categories: ["General"] });
  });

  it("migra el mapa viejo de fechas", () => {
    const events = migrateEvents({ f1: { time: "11:00" } });
    expect(events[0].id).toBe("f1");
    expect(events[0].date).toBe("2026-10-03");
    expect(events[0].name).toBe("Fecha 1");
  });

  it("conserva resultados al editar una fecha", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state = updateScore(state, "s1", 0, "4");
    state = saveFecha(state, {
      id: fechaId,
      name: "Fecha norte",
      date: "2026-11-01",
      time: "13:00",
      avisos: "Sin cambios"
    });
    expect(state.events[0].name).toBe("Fecha norte");
    expect(state.events[0].scores.s1).toEqual(["4"]);
    expect(state.events[0].racesCount).toBe(3);
  });
});

function sailor(partial: Partial<Sailor> & Pick<Sailor, "id" | "sailNumber" | "name">): Sailor {
  return {
    boatClass: "ILCA 6",
    category: "General",
    club: "CNA",
    fechas: ["f1"],
    ...partial
  };
}

function cloudRow(state: ChampionshipState) {
  const payload = cloudPayload(state);
  return { sailors: payload.sailors, events: payload.events };
}

describe("inscripciones de varios dispositivos", () => {
  it("suma un competidor que solo existe en el otro celular", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "a", sailNumber: "1", name: "Ana" })];
    const remote = defaultState();
    remote.sailors = [
      sailor({ id: "a", sailNumber: "1", name: "Ana" }),
      sailor({ id: "b", sailNumber: "2", name: "Beto", updatedAt: 10 })
    ];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors.map((item) => item.name)).toEqual(["Ana", "Beto"]);
  });

  it("conserva una inscripción local si la nube todavía manda la lista vieja", () => {
    const local = defaultState();
    local.sailors = [
      sailor({ id: "a", sailNumber: "1", name: "Ana", updatedAt: 5 }),
      sailor({ id: "b", sailNumber: "2", name: "Beto", updatedAt: 20 })
    ];
    const remote = defaultState();
    remote.sailors = [sailor({ id: "a", sailNumber: "1", name: "Ana", updatedAt: 5 })];
    const row = cloudRow(remote);
    const merged = mergeRemote(local, row);
    expect(merged.sailors.map((item) => item.id)).toEqual(["a", "b"]);
    expect(syncFingerprint(merged)).not.toBe(syncFingerprint(cloudView(row)));
  });

  it("no reescribe la nube cuando el celular ya tiene la misma lista", () => {
    const remote = defaultState();
    remote.sailors = [
      sailor({ id: "a", sailNumber: "37986079", name: "Santiago Pando" }),
      sailor({ id: "b", sailNumber: "86", name: "Tomas Petersen" })
    ];
    const row = cloudRow(remote);
    const merged = mergeRemote(cloudView(row), row);
    expect(syncFingerprint(merged)).toBe(syncFingerprint(cloudView(row)));
  });

  it("una baja más nueva no vuelve a entrar con una copia vieja", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "a", sailNumber: "1", name: "Ana", updatedAt: 10 })];
    const remote = defaultState();
    remote.sailors = [];
    remote.removedSailors = [{ sailNumber: "1", boatClass: "ILCA 6", at: 50 }];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors).toEqual([]);
    expect(merged.removedSailors).toHaveLength(1);
  });

  it("permite volver a inscribir a alguien que había sido dado de baja", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "a2", sailNumber: "1", name: "Ana", updatedAt: 80 })];
    const remote = defaultState();
    remote.removedSailors = [{ sailNumber: "1", boatClass: "ILCA 6", at: 50 }];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors.map((item) => item.name)).toEqual(["Ana"]);
    expect(merged.removedSailors).toEqual([]);
  });

  it("junta las fechas de la misma vela y deja una sola ficha", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "local", sailNumber: "7", name: "Ana", fechas: ["f1"], updatedAt: 10 })];
    const remote = defaultState();
    remote.sailors = [sailor({ id: "remote", sailNumber: "7", name: "Ana María", fechas: ["f2"], updatedAt: 20 })];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors).toHaveLength(1);
    expect(merged.sailors[0].id).toBe("remote");
    expect(merged.sailors[0].fechas).toEqual(["f1", "f2"]);
    expect(merged.sailors[0].name).toBe("Ana María");
  });

  it("registra la hora de la inscripción y la baja", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state = registerSailor(state, {
      sailNumber: "arg 9",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fecha: fechaId
    }).state;
    expect(state.sailors[0].sailNumber).toBe("ARG 9");
    expect(state.sailors[0].updatedAt).toBeGreaterThan(0);
    state = removeSailor(state, state.sailors[0].id);
    expect(state.sailors).toEqual([]);
    expect(state.removedSailors[0]).toMatchObject({ sailNumber: "ARG 9", boatClass: "ILCA 6" });
  });
});
