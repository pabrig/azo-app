import { describe, expect, it } from "vitest";
import { cloudPayload, cloudView, mergeClassesMeta, mergeRemote, syncFingerprint } from "./cloud";
import { defaultState, migrateClasses, migrateEvents } from "./model";
import { dateNet, fleetSize, pointsFor, rankedForFecha, rankedOverall } from "./scoring";
import {
  deleteBoatClass,
  deleteFecha,
  registerSailor,
  removeSailor,
  saveBoatClass,
  saveFecha,
  updateScore
} from "./mutations";
import type { ChampionshipState, Sailor } from "./types";

describe("puntaje low point", () => {
  it("cuenta un código de penalización como flota + 1", () => {
    expect(pointsFor("DNF", 10)).toBe(11);
    expect(pointsFor("3", 10)).toBe(3);
    expect(pointsFor("", 10)).toBeNull();
  });

  it("respeta la cantidad de descartes configurada en la fecha", () => {
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
    state.sailors = [sailor];
    state.events[0].racesCount = 5;
    state.events[0].discardsAllowed = 2;
    state.events[0].scores.s1 = ["1", "2", "3", "8", "9"];
    const net = dateNet(state, sailor, fechaId);
    expect(net.discarded).toBe(17);
    expect(net.net).toBe(6);
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
    state.events[0].discardsAllowed = 1;
    state.events[0].scores.s1 = ["1", "2", "8", "3"];
    const net = dateNet(state, sailor, fechaId);
    expect(fleetSize(state, "ILCA 6", fechaId)).toBe(2);
    expect(net.discarded).toBe(8);
    expect(net.net).toBe(6);
  });

  it("no descarta DSQ ni DNE aunque sean el peor puntaje", () => {
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
    state.sailors = [sailor, { ...sailor, id: "s2", sailNumber: "ARG 2", name: "Beto" }];
    state.events[0].racesCount = 4;
    state.events[0].discardsAllowed = 1;
    state.events[0].scores.s1 = ["1", "2", "8", "DSQ"];
    const net = dateNet(state, sailor, fechaId);
    expect(net.discarded).toBe(8);
    expect(net.net).toBe(6);
  });

  it("desempata por RRS A8.1 (mejor regata) con igual puntaje neto en la fecha", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state.events[0].racesCount = 2;
    state = {
      ...state,
      sailors: [
        {
          id: "a",
          sailNumber: "ARG 1",
          boatClass: "ILCA 6",
          name: "Ana",
          category: "General",
          club: "CNA",
          fechas: [fechaId]
        },
        {
          id: "b",
          sailNumber: "ARG 2",
          boatClass: "ILCA 6",
          name: "Beto",
          category: "General",
          club: "CNA",
          fechas: [fechaId]
        }
      ]
    };
    state = updateScore(state, "a", 0, "1");
    state = updateScore({ ...state, fecha: fechaId }, "a", 1, "4");
    state = updateScore(state, "b", 0, "2");
    state = updateScore({ ...state, fecha: fechaId }, "b", 1, "3");
    const ranked = rankedForFecha(state, fechaId);
    expect(ranked.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("suma puntos netos por fecha en el ranking general y desempata por mejor fecha", () => {
    let state = defaultState();
    const f1 = state.events[0].id;
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-02",
      time: "12:00",
      avisos: ""
    }).state!;
    const f2 = state.events.find((event) => event.name === "Fecha 2")!.id;
    state = {
      ...state,
      sailors: [
        {
          id: "a",
          sailNumber: "1",
          boatClass: "ILCA 6",
          name: "Ana",
          category: "General",
          club: "CNA",
          fechas: [f1, f2]
        },
        {
          id: "b",
          sailNumber: "2",
          boatClass: "ILCA 6",
          name: "Beto",
          category: "General",
          club: "CNA",
          fechas: [f1, f2]
        }
      ]
    };
    state.events.find((event) => event.id === f1)!.racesCount = 1;
    state.events.find((event) => event.id === f2)!.racesCount = 1;
    state = updateScore({ ...state, fecha: f1 }, "a", 0, "1");
    state = updateScore({ ...state, fecha: f1 }, "b", 0, "2");
    state = updateScore({ ...state, fecha: f2 }, "a", 0, "2");
    state = updateScore({ ...state, fecha: f2 }, "b", 0, "1");
    const ranked = rankedOverall(state);
    expect(ranked[0].net).toBe(ranked[1].net);
    expect(ranked.map((item) => item.id)).toEqual(["b", "a"]);
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
    expect(classes[0].categories).toEqual(["Masculino", "Femenino", "General"]);
    expect(classes[1]).toEqual({ name: "Optimist", categories: ["Masculino", "Femenino", "General"] });
  });

  it("migra el mapa viejo de fechas", () => {
    const events = migrateEvents({ f1: { time: "11:00" } });
    expect(events[0].id).toBe("f1");
    expect(events[0].date).toBe("2026-10-03");
    expect(events[0].name).toBe("Fecha 1");
  });

  it("borra clases y no las revive la nube si el cambio es más nuevo", () => {
    let local = defaultState();
    local = deleteBoatClass(local, "Pampero")!;
    expect(local.classes.some((item) => item.name === "Pampero")).toBe(false);
    expect(local.classesAt).toBeGreaterThan(0);

    const remote = defaultState();
    remote.classesAt = 0;
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.classes.some((item) => item.name === "Pampero")).toBe(false);
    expect(merged.classesAt).toBe(local.classesAt);
  });

  it("reubica inscriptos al borrar una clase", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    state = registerSailor(state, {
      sailNumber: "1",
      boatClass: "Pampero",
      name: "Ana Test",
      category: "General",
      club: "CNA",
      fecha
    }).state;
    state = deleteBoatClass(state, "Pampero")!;
    expect(state.sailors[0].boatClass).not.toBe("Pampero");
    expect(state.classes.some((item) => item.name === "Pampero")).toBe(false);
  });

  it("migra clases creadas con categorías viejas al trío Masculino / Femenino / General", () => {
    const classes = migrateClasses([
      { name: "Catamarán", categories: ["General"] },
      { name: "ILCA 6", categories: ["General", "Junior", "Femenino"] }
    ]);
    expect(classes.find((item) => item.name === "Catamarán")?.categories).toEqual([
      "Masculino",
      "Femenino",
      "General"
    ]);
    expect(classes.find((item) => item.name === "ILCA 6")?.categories).toEqual([
      "Masculino",
      "Femenino",
      "General",
      "Junior"
    ]);
  });

  it("actualiza categorías de una clase existente", () => {
    let state = defaultState();
    state.classes = [{ name: "ILCA 6", categories: ["General"] }];
    const result = saveBoatClass(state, {
      name: "ILCA 6",
      original: "ILCA 6",
      categories: ["Masculino", "Femenino", "General", "Master"]
    });
    expect(result.error).toBeUndefined();
    expect(result.state!.classes.find((item) => item.name === "ILCA 6")?.categories).toContain("Master");
  });

  it("guarda categorías personalizadas al crear una clase", () => {
    const state = defaultState();
    const result = saveBoatClass(state, {
      name: "Optimist",
      original: "",
      categories: ["Masculino", "Femenino", "General", "Cadete", "Cadete"]
    });
    expect(result.error).toBeUndefined();
    const saved = result.state!.classes.find((item) => item.name === "Optimist");
    expect(saved?.categories).toEqual(["Masculino", "Femenino", "General", "Cadete"]);
  });

  it("mergeClassesMeta respeta el timestamp más reciente", () => {
    const local = [{ name: "ILCA 6", categories: ["General"] }];
    const remote = [
      { name: "ILCA 6", categories: ["General"] },
      { name: "Optimist", categories: ["General"] }
    ];
    expect(mergeClassesMeta(local, 200, remote, 50).classes.map((item) => item.name)).toEqual(["ILCA 6"]);
    expect(mergeClassesMeta(local, 50, remote, 200).classes.map((item) => item.name)).toEqual(["ILCA 6", "Optimist"]);
  });

  it("elimina fechas en comisión y no las revive al sincronizar", () => {
    let local = defaultState();
    const created = saveFecha(local, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-02",
      time: "12:00",
      avisos: ""
    });
    local = created.state!;
    const removedId = local.events.find((event) => event.name === "Fecha 2")!.id;
    local = deleteFecha(local, removedId)!;
    expect(local.events.some((event) => event.id === removedId)).toBe(false);

    const remote = defaultState();
    remote.events = [
      ...remote.events,
      {
        ...remote.events[0],
        id: removedId,
        name: "Fecha 2",
        date: "2026-11-02",
        time: "12:00",
        avisos: "",
        updatedAt: 0
      }
    ];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.events.some((event) => event.id === removedId)).toBe(false);
    expect(merged.removedFechas.some((stamp) => stamp.id === removedId)).toBe(true);
  });

  it("propaga fechas nuevas y ediciones entre dispositivos", () => {
    let phoneA = defaultState();
    phoneA = saveFecha(phoneA, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-02",
      time: "12:00",
      avisos: "Aviso A"
    }).state!;
    const fecha2Id = phoneA.events.find((event) => event.name === "Fecha 2")!.id;

    const phoneB = defaultState();
    let merged = mergeRemote(phoneB, cloudRow(phoneA));
    expect(merged.events.some((event) => event.id === fecha2Id)).toBe(true);

    phoneA = saveFecha(phoneA, {
      id: fecha2Id,
      name: "Fecha 2",
      date: "2026-11-02",
      time: "14:30",
      avisos: "Cambio horario"
    }).state!;
    merged = mergeRemote(merged, cloudRow(phoneA));
    expect(merged.events.find((event) => event.id === fecha2Id)?.time).toBe("14:30");
  });

  it("conserva resultados al editar una fecha", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state = updateScore(state, "s1", 0, "4");
    const result = saveFecha(state, {
      id: fechaId,
      name: "Fecha norte",
      date: "2026-11-01",
      time: "13:00",
      avisos: "Sin cambios"
    });
    expect(result.error).toBeUndefined();
    state = result.state!;
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
    expect(mergeRemote(merged, cloudRow(merged)).sailors.map((item) => item.name)).toEqual(["Ana"]);
  });

  it("junta las fechas de la misma persona anotada en dos celulares", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "local", sailNumber: "7", name: "Ana", fechas: ["f1"], updatedAt: 10 })];
    const remote = defaultState();
    remote.sailors = [sailor({ id: "remote", sailNumber: "7", name: "ana ", fechas: ["f2"], updatedAt: 20 })];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors).toHaveLength(1);
    expect(merged.sailors[0].id).toBe("remote");
    expect(merged.sailors[0].fechas).toEqual(["f1", "f2"]);
  });

  it("el mismo nombre y apellido es la misma persona aunque cambie vela, clase o club", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    state = registerSailor(state, { sailNumber: "86", boatClass: "ILCA 6", name: "Tomas Petersen", category: "General", club: "CNA", fecha }).state;
    state = registerSailor(state, { sailNumber: "211983", boatClass: "ILCA 7", name: "tomás  petersen", category: "Master", club: "YCA", fecha }).state;
    expect(state.sailors).toHaveLength(1);
    expect(state.sailors[0]).toMatchObject({ sailNumber: "211983", boatClass: "ILCA 7", club: "YCA" });
  });

  it("vela, clase y club repetidos no unen a dos personas distintas", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    for (const name of ["Ana Gómez", "Beto Ruiz", "Carla Paz"]) {
      state = registerSailor(state, { sailNumber: "170287", boatClass: "ILCA 6", name, category: "General", club: "CNA", fecha }).state;
    }
    expect(state.sailors).toHaveLength(3);
    expect(mergeRemote(defaultState(), cloudRow(state)).sailors).toHaveLength(3);
  });

  it("dos timoneles con la misma vela o NN quedan como dos inscriptos", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    for (const name of ["Pablo Rigalli", "Ramiro Pedernera"]) {
      state = registerSailor(state, { sailNumber: "NN", boatClass: "ILCA 6", name, category: "General", club: "", fecha }).state;
    }
    expect(state.sailors.map((item) => item.name)).toEqual(["Pablo Rigalli", "Ramiro Pedernera"]);
    const merged = mergeRemote(defaultState(), cloudRow(state));
    expect(merged.sailors).toHaveLength(2);
  });

  it("separa a dos personas que una versión vieja dejó con el mismo id", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "x", sailNumber: "NN", name: "Pablo Rigalli", updatedAt: 10 })];
    const remote = defaultState();
    remote.sailors = [sailor({ id: "x", sailNumber: "NN", name: "Ramiro Pedernera", updatedAt: 20 })];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors).toHaveLength(2);
    expect(new Set(merged.sailors.map((item) => item.id)).size).toBe(2);
    expect(merged.sailors.find((item) => item.name === "Ramiro Pedernera")?.id).toBe("x");
  });

  it("dos celulares que anotan a la vez terminan con todos los inscriptos", () => {
    const base = defaultState();
    const fecha = base.events[0].id;
    let phoneA = base;
    let phoneB = base;
    for (let index = 1; index <= 8; index += 1) {
      phoneA = registerSailor(phoneA, {
        sailNumber: `A${index}`, boatClass: "ILCA 6", name: `Timonel A${index}`, category: "General", club: "", fecha
      }).state;
      phoneB = registerSailor(phoneB, {
        sailNumber: `B${index}`, boatClass: "ILCA 7", name: `Timonel B${index}`, category: "General", club: "", fecha
      }).state;
    }
    const cloudAfterA = cloudRow(phoneA);
    phoneB = mergeRemote(phoneB, cloudAfterA);
    const cloudAfterB = cloudRow(phoneB);
    phoneA = mergeRemote(phoneA, cloudAfterB);
    expect(phoneA.sailors).toHaveLength(16);
    expect(phoneB.sailors).toHaveLength(16);
    expect(syncFingerprint(phoneA)).toBe(syncFingerprint(phoneB));
  });

  it("una baja borra solo a esa persona y no a otro con la misma vela", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    for (const name of ["Ana", "Beto"]) {
      state = registerSailor(state, { sailNumber: "NN", boatClass: "ILCA 6", name, category: "General", club: "", fecha }).state;
    }
    const ana = state.sailors.find((item) => item.name === "Ana");
    const removed = removeSailor(state, ana!.id);
    const otherPhone = mergeRemote(state, cloudRow(removed));
    expect(otherPhone.sailors.map((item) => item.name)).toEqual(["Beto"]);
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
