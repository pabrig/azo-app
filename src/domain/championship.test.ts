import { describe, expect, it } from "vitest";
import { cloudPayload, cloudView, hasCloudChampionship, mergeClassesMeta, mergeRemote, syncFingerprint } from "./cloud";
import { sameBoatClass } from "./class-names";
import { canonicalBoatClassName, migrateChampionshipState } from "./migrate-championship";
import {
  defaultState,
  isFechaRegistrationClosed,
  makeFecha,
  migrateClasses,
  migrateEvents,
  normalizeLoadedState,
  resolveActiveFecha,
  sailorsInFecha,
  upcomingFechaId
} from "./model";
import { cargaRacesCount } from "./race-slots";
import { normalizeScoreEntry } from "./score-entry";
import {
  dateNet,
  effectiveDiscardsAllowed,
  fechaResultsStarted,
  fleetSize,
  formatRaceDiscardSummary,
  placaColumns,
  pointsFor,
  raceIndexesWithResults,
  rankedForFecha,
  rankedOverall
} from "./scoring";
import {
  addRace,
  deleteBoatClass,
  deleteFecha,
  registerSailor,
  removeRace,
  removeSailor,
  saveBoatClass,
  saveFecha,
  saveWhatsapp,
  setDiscardsAllowed,
  updateSailor,
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

  it("normaliza Descalificado a DSQ al cargar y no lo descarta del neto", () => {
    expect(normalizeScoreEntry("Descalificado")).toBe("DSQ");
    expect(normalizeScoreEntry("descalificado")).toBe("DSQ");
    let state = defaultState();
    state.events[0].racesCount = 4;
    state = updateScore(state, "s1", 3, "Descalificado");
    expect(state.events[0].scores.s1?.[3]).toBe("DSQ");
  });

  it("no descarta DSQ ni DNE cuando son el peor puntaje", () => {
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
    expect(pointsFor("DSQ", 2)).toBe(3);
    expect(pointsFor("DNE", 2)).toBe(3);

    for (const code of ["DSQ", "DNE"] as const) {
      state.events[0].scores.s1 = ["1", "2", "1", code];
      const net = dateNet(state, sailor, fechaId);
      expect(net.racePts).toEqual([1, 2, 1, 3]);
      expect(net.discarded).toBe(2);
      expect(net.discardedRaceIndexes).toEqual([1]);
      expect(net.net).toBe(5);
    }

    state.events[0].scores.s1 = ["1", "2", "1", "DNF"];
    const dnf = dateNet(state, sailor, fechaId);
    expect(dnf.racePts).toEqual([1, 2, 1, 3]);
    expect(dnf.discarded).toBe(3);
    expect(dnf.net).toBe(4);
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

  it("el ranking del campeonato suma el neto de cada fecha sin descartar el DSQ", () => {
    let state = defaultState();
    const f1 = state.events[0].id;
    state.events[0].racesCount = 3;
    state.events[0].discardsAllowed = 1;
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-02",
      time: "12:00",
      avisos: ""
    }).state!;
    const f2 = state.events.find((event) => event.name === "Fecha 2")!.id;
    state.events.find((event) => event.id === f2)!.racesCount = 1;
    state.events.find((event) => event.id === f2)!.discardsAllowed = 0;
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
    state.events.find((event) => event.id === f1)!.scores = {
      a: ["1", "1", "DSQ"],
      b: ["2", "2", "2"]
    };
    state.events.find((event) => event.id === f2)!.scores = {
      a: ["2"],
      b: ["1"]
    };

    const anaDate = dateNet(state, state.sailors[0], f1);
    expect(anaDate.racePts).toEqual([1, 1, 3]);
    expect(anaDate.discarded).toBe(1);
    expect(anaDate.net).toBe(4);

    const ranked = rankedOverall(state);
    expect(ranked.find((item) => item.id === "a")?.breakdown).toEqual([4, 2]);
    expect(ranked.find((item) => item.id === "a")?.net).toBe(6);
    expect(ranked.find((item) => item.id === "b")?.breakdown).toEqual([4, 1]);
    expect(ranked.find((item) => item.id === "b")?.net).toBe(5);
    expect(ranked.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("fecha 1 CampeonatAzo 03/10/2026 — laser radial (ILCA 6), 3 regatas y 1 descarte", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state.events[0].racesCount = 3;
    state.events[0].discardsAllowed = 1;
    state.events[0].date = "2026-10-03";

    const mk = (id: string, name: string, sailNumber: string) => ({
      id,
      sailNumber,
      boatClass: "ILCA 6",
      name,
      category: "General",
      club: "CNA",
      fechas: [fechaId] as string[]
    });

    state = {
      ...state,
      classFilter: "ILCA 6",
      sailors: [
        mk("santiago", "Santiago Pando", "ARG S1"),
        mk("tomas", "Tomas Petersen", "ARG T1"),
        mk("pablo", "Pablo Rigalli", "ARG P1"),
        mk("jose", "José Zafarian", "ARG J1"),
        mk("ahutiz", "Ahutiz Caracciolo", "ARG A1"),
        mk("ramiro", "Ramiro Pedernera", "ARG R1"),
        mk("leo", "Leonardo Semenzato", "ARG L1")
      ]
    };

    state.events[0].scores = {
      santiago: ["2", "1", "1"],
      tomas: ["1", "2", "3"],
      pablo: ["3", "DNF", "4"],
      jose: ["DNC", "DNF", "2"]
    };

    expect(fleetSize(state, "ILCA 6", fechaId)).toBe(7);
    const santiago = dateNet(state, state.sailors[0], fechaId);
    expect(santiago.net).toBe(2);
    expect(santiago.discardedRaceIndexes).toEqual([0]);
    expect(dateNet(state, state.sailors[1], fechaId).net).toBe(3);
    expect(dateNet(state, state.sailors[2], fechaId).net).toBe(7);
    expect(dateNet(state, state.sailors[3], fechaId).net).toBe(10);

    const ranked = rankedForFecha(state, fechaId);
    expect(ranked.slice(0, 4).map((s) => s.name)).toEqual([
      "Santiago Pando",
      "Tomas Petersen",
      "Pablo Rigalli",
      "José Zafarian"
    ]);

    const overall = rankedOverall(state);
    expect(overall[0].net).toBe(2);
    expect(overall[0].name).toBe("Santiago Pando");
  });

  it("3 regatas sin descarte configurado usa 1 descarte por defecto", () => {
    const state = defaultState();
    expect(state.events[0].discardsAllowed).toBe(1);
    expect(effectiveDiscardsAllowed(state.events[0])).toBe(1);
  });

  it("fecha sin carga de comisión no suma DNC ni aparece en placa/ranking", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2026-12-01",
      time: "12:00",
      avisos: ""
    }).state!;
    const futureId = state.events.find((event) => event.name === "Fecha 2")!.id;
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
          fechas: [fechaId, futureId]
        }
      ]
    };
    expect(fechaResultsStarted(state.events.find((event) => event.id === futureId)!)).toBe(false);
    expect(dateNet(state, state.sailors[0], futureId).net).toBe(0);
    expect(rankedForFecha(state, futureId)).toEqual([]);

    state.events.find((event) => event.id === fechaId)!.racesCount = 1;
    state = updateScore({ ...state, fecha: fechaId }, "a", 0, "1");
    const overall = rankedOverall(state);
    expect(overall[0].breakdown).toEqual([1]);
    expect(overall[0].net).toBe(1);
  });

  it("placa solo muestra columnas de regatas con al menos un resultado cargado", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state.events[0].racesCount = 3;
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
    state = updateScore({ ...state, fecha: fechaId }, "a", 0, "1");
    state = updateScore({ ...state, fecha: fechaId }, "b", 0, "2");
    const event = state.events.find((item) => item.id === fechaId)!;
    expect(raceIndexesWithResults(event)).toEqual([0]);
    expect(placaColumns(event)).toEqual(["R1"]);
    expect(dateNet(state, state.sailors[1], fechaId).net).toBe(2);
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

describe("migrate championship", () => {
  it("sameBoatClass agrupa alias con ILCA 6/7 para flota y filtros", () => {
    expect(sameBoatClass("Laser radial", "ILCA 6")).toBe(true);
    expect(sameBoatClass("Laser std", "ILCA 7")).toBe(true);
    expect(sameBoatClass("Pampero", "ILCA 6")).toBe(false);
  });

  it("renombra laser radial/std a ILCA 6/7 y ajusta descartes", () => {
    expect(canonicalBoatClassName("Laser radial")).toBe("ILCA 6");
    expect(canonicalBoatClassName("Laser std")).toBe("ILCA 7");

    let state = defaultState();
    state.sailors = [
      {
        id: "1",
        sailNumber: "A",
        boatClass: "Laser radial",
        name: "Ana",
        category: "General",
        club: "CNA",
        fechas: [state.events[0].id]
      }
    ];
    state.classes = [{ name: "Laser std", categories: ["General"] }];
    state.events[0].discardsAllowed = 0;
    state.events[0].racesCount = 3;

    const { state: next, report } = migrateChampionshipState(state);
    expect(next.sailors[0].boatClass).toBe("ILCA 6");
    expect(next.classes.some((c) => c.name === "ILCA 7")).toBe(true);
    expect(next.events[0].discardsAllowed).toBe(1);
    expect(report.some((line) => line.includes("descartes"))).toBe(true);
  });

  it("hidratar o migrar no recorta las regatas que la comisión configuró", () => {
    const state = defaultState();
    state.events[0].racesCount = 6;
    state.events[0].discardsAllowed = 1;
    state.events[0].scores = { a: ["1", "2", "3", null, null, null] };
    const { state: next } = migrateChampionshipState(state);
    expect(next.events[0].racesCount).toBe(6);
    expect(makeFecha(state.events[0]).racesCount).toBe(6);
    expect(placaColumns(next.events[0])).toEqual(["R1", "R2", "R3"]);
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

  it("propaga regatas y descartes de una fecha aún sin resultados (Fecha 2)", () => {
    let phoneA = defaultState();
    phoneA = saveFecha(phoneA, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-14",
      time: "12:00",
      avisos: "",
      racesCount: 5,
      discardsAllowed: 1
    }).state!;
    const fecha2Id = phoneA.events.find((event) => event.name === "Fecha 2")!.id;
    expect(phoneA.events.find((event) => event.id === fecha2Id)?.racesCount).toBe(5);

    let phoneB = mergeRemote(defaultState(), cloudRow(phoneA));
    expect(phoneB.events.find((event) => event.id === fecha2Id)?.racesCount).toBe(5);

    phoneA = saveFecha(phoneA, {
      id: fecha2Id,
      name: "Fecha 2",
      date: "2026-11-14",
      time: "12:00",
      avisos: "",
      racesCount: 2,
      discardsAllowed: 0
    }).state!;
    phoneB = mergeRemote(phoneB, cloudRow(phoneA));
    const synced = phoneB.events.find((event) => event.id === fecha2Id);
    expect(synced?.racesCount).toBe(2);
    expect(synced?.discardsAllowed).toBe(0);

    const stale = defaultState();
    stale.events = [
      ...stale.events,
      {
        ...phoneA.events.find((event) => event.id === fecha2Id)!,
        racesCount: 3,
        discardsAllowed: 1,
        updatedAt: 1
      }
    ];
    const recovered = mergeRemote(stale, cloudRow(phoneA));
    expect(recovered.events.find((event) => event.id === fecha2Id)?.racesCount).toBe(2);
  });

  it("editar regatas de una fecha con resultados se ve en el FE y sobrevive el sync", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state.events[0] = {
      ...state.events[0],
      racesCount: 3,
      discardsAllowed: 1,
      scores: { s1: ["1", "2", "3"] },
      updatedAt: 10
    };
    state = saveFecha(state, {
      id: fechaId,
      name: state.events[0].name,
      date: state.events[0].date,
      time: state.events[0].time,
      avisos: state.events[0].avisos || "",
      racesCount: 5,
      discardsAllowed: 1
    }).state!;
    expect(state.events[0].racesCount).toBe(5);
    expect(formatRaceDiscardSummary(state.events[0]).line).toContain("5 previstas");

    const fromCloud = mergeRemote(defaultState(), cloudRow(state));
    expect(fromCloud.events[0].racesCount).toBe(5);
    expect(makeFecha(JSON.parse(cloudRow(state).events as string).fechas[0]).racesCount).toBe(5);

    const bounced = mergeRemote(state, cloudRow(fromCloud));
    expect(bounced.events[0].racesCount).toBe(5);
    expect(placaColumns(bounced.events[0])).toEqual(["R1", "R2", "R3"]);
  });

  it("cargar puntos no pisa regatas, avisos ni AR/IR de la otra comisión", () => {
    let fechaMeta = defaultState();
    const fechaId = fechaMeta.events[0].id;
    fechaMeta = saveFecha(fechaMeta, {
      id: fechaId,
      name: "Fecha 1",
      date: "2026-11-01",
      time: "12:00",
      avisos: "Aviso norte",
      racesCount: 3,
      discardsAllowed: 1,
      ar: { name: "AR.pdf", dataUrl: "data:application/pdf;base64,AAA" },
      ir: { name: "IR.pdf", dataUrl: "data:application/pdf;base64,BBB" }
    }).state!;

    let carga = mergeRemote(defaultState(), cloudRow(fechaMeta));
    carga = updateScore({ ...carga, fecha: fechaId }, "s1", 0, "2");
    carga = updateScore({ ...carga, fecha: fechaId }, "s1", 1, "4");

    const fromCarga = mergeRemote(fechaMeta, cloudRow(carga));
    expect(fromCarga.events[0]).toMatchObject({
      racesCount: 3,
      avisos: "Aviso norte",
      scores: { s1: ["2", "4"] }
    });
    expect(fromCarga.events[0].ar.dataUrl).toContain("AAA");
    expect(fromCarga.events[0].ir.dataUrl).toContain("BBB");

    const fromMeta = mergeRemote(carga, cloudRow(fechaMeta));
    expect(fromMeta.events[0].ar.dataUrl).toContain("AAA");
    expect(fromMeta.events[0].ir.dataUrl).toContain("BBB");
    expect(fromMeta.events[0].scores.s1).toEqual(["2", "4"]);
  });

  it("puntos de Fecha 1 no revierten las regatas de Fecha 2", () => {
    let phoneA = defaultState();
    phoneA = saveFecha(phoneA, {
      id: "",
      name: "Fecha 2",
      date: "2026-11-14",
      time: "12:00",
      avisos: "",
      racesCount: 2,
      discardsAllowed: 0
    }).state!;
    const fecha2Id = phoneA.events.find((event) => event.name === "Fecha 2")!.id;

    let phoneB = mergeRemote(defaultState(), cloudRow(phoneA));
    phoneB = updateScore({ ...phoneB, fecha: phoneB.events[0].id }, "s1", 0, "3");

    phoneA = mergeRemote(phoneA, cloudRow(phoneB));
    expect(phoneA.events.find((event) => event.id === fecha2Id)?.racesCount).toBe(2);
    expect(phoneA.events[0].scores.s1?.[0]).toBe("3");
  });

  it("el WhatsApp de comisión no vuelve al default al sincronizar", () => {
    const saved = saveWhatsapp(defaultState(), "https://chat.whatsapp.com/ABC123");
    const local = saved.state!;
    expect(local.whatsappUrl).toContain("ABC123");

    const againstDefault = mergeRemote(local, cloudRow(defaultState()));
    expect(againstDefault.whatsappUrl).toContain("ABC123");
    expect(againstDefault.whatsappAt).toBeGreaterThan(0);

    const packed = JSON.parse(cloudRow(local).events as string) as { whatsappAt?: number; whatsappUrl?: string };
    expect(packed.whatsappAt).toBeGreaterThan(0);
    expect(packed.whatsappUrl).toContain("ABC123");

    const otherPhone = mergeRemote(defaultState(), cloudRow(local));
    expect(otherPhone.whatsappUrl).toContain("ABC123");
  });

  it("un payload de Appwrite sin events no reinyecta la fecha semilla", () => {
    const created = saveFecha(defaultState(), {
      id: "",
      name: "Fecha 2",
      date: "2026-11-14",
      time: "12:00",
      avisos: "",
      racesCount: 2,
      discardsAllowed: 0
    });
    const state = created.state!;
    expect(state.events).toHaveLength(2);
    expect(hasCloudChampionship({ $id: "champ", sailors: "[]" })).toBe(false);
    expect(hasCloudChampionship(cloudRow(state))).toBe(true);
    const merged = mergeRemote(state, { $id: "champ", sailors: "[]" });
    expect(merged.events).toHaveLength(2);
    expect(merged.events.map((event) => event.name)).toEqual(state.events.map((event) => event.name));
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

  it("la comisión puede corregir un resultado de una fecha ya corrida y queda en placa, ranking y sync", () => {
    let state = defaultState();
    const fechaId = state.events[0].id;
    state.events[0] = { ...state.events[0], date: "2020-01-01", racesCount: 1 };
    state.sailors = [
      {
        id: "a",
        sailNumber: "1",
        boatClass: "ILCA 6",
        name: "Ana",
        category: "General",
        club: "CNA",
        fechas: [fechaId]
      }
    ];
    state = updateScore({ ...state, fecha: fechaId }, "a", 0, "5");
    expect(rankedForFecha(state, fechaId)[0].net).toBe(5);

    const staleCloud = {
      sailors: cloudRow(state).sailors,
      events: cloudPayload({
        ...state,
        events: state.events.map((event) =>
          event.id === fechaId
            ? { ...event, scores: { a: ["5"] }, scoreAt: { a: 1 }, updatedAt: 1 }
            : event
        )
      }).events
    };

    state = updateScore(state, "a", 0, "1");
    expect(state.events[0].scores.a?.[0]).toBe("1");
    expect(rankedForFecha(state, fechaId)[0].net).toBe(1);
    expect(rankedOverall(state)[0].net).toBe(1);

    const merged = mergeRemote(state, staleCloud);
    expect(merged.events[0].scores.a?.[0]).toBe("1");
    expect(rankedForFecha(merged, fechaId)[0].net).toBe(1);
    expect(rankedOverall(merged)[0].net).toBe(1);
  });

  it("la comisión cambia descartes de la fecha activa", () => {
    let state = defaultState();
    state.events[0].racesCount = 3;
    state.events[0].discardsAllowed = 1;
    state = setDiscardsAllowed(state, 2);
    expect(state.events[0].discardsAllowed).toBe(2);
    state = setDiscardsAllowed(state, 9);
    expect(state.events[0].discardsAllowed).toBe(2);
  });

  it("columnas vacías de más no inflan placa ni ranking; Carga sigue la cantidad editada", () => {
    const scores = { a: ["1", "2", "3", null, null, null] };
    expect(cargaRacesCount({ scores, racesCount: 6 })).toBe(3);
    expect(makeFecha({ scores, racesCount: 6, discardsAllowed: 1 }).racesCount).toBe(6);

    let state = defaultState();
    const fechaId = state.events[0].id;
    state.sailors = [
      {
        id: "a",
        sailNumber: "1",
        boatClass: "ILCA 6",
        name: "Ana",
        category: "General",
        club: "CNA",
        fechas: [fechaId]
      }
    ];
    state.events[0] = {
      ...state.events[0],
      racesCount: 6,
      discardsAllowed: 1,
      scores
    };
    expect(formatRaceDiscardSummary(state.events[0]).line).toBe("3 regatas publicadas · 6 previstas · 1 descarte");
    expect(placaColumns(state.events[0])).toEqual(["R1", "R2", "R3"]);
    expect(dateNet(state, state.sailors[0], fechaId).net).toBe(3);

    state = addRace(state);
    expect(state.events[0].racesCount).toBe(6);

    state = removeRace(state);
    expect(state.events[0].racesCount).toBe(5);

    const saved = saveFecha(state, {
      id: fechaId,
      name: state.events[0].name,
      date: state.events[0].date,
      time: state.events[0].time,
      avisos: "",
      racesCount: 3,
      discardsAllowed: 1
    }).state!;
    expect(saved.events[0].racesCount).toBe(3);
    expect(saved.events[0].scores.a).toEqual(["1", "2", "3"]);
  });

  it("el sync no revive 6 columnas vacías si solo hay 3 regatas cargadas", () => {
    const local = defaultState();
    local.events[0] = {
      ...local.events[0],
      racesCount: 3,
      discardsAllowed: 1,
      scores: { a: ["1", "2", "3"] },
      updatedAt: 20
    };
    const remote = defaultState();
    remote.events[0] = {
      ...remote.events[0],
      racesCount: 6,
      discardsAllowed: 1,
      scores: { a: ["1", "2", "3"] },
      updatedAt: 10
    };
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.events[0].racesCount).toBe(3);
  });
});

describe("edición de inscripto", () => {
  it("actualiza vela, clase, celular y DNI sin perder fechas", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    state = registerSailor(state, {
      sailNumber: "1",
      boatClass: "ILCA 6",
      name: "Ana Gómez",
      category: "General",
      club: "CNA",
      celular: "111",
      dni: "123",
      fecha
    }).state;
    const id = state.sailors[0].id;
    const result = updateSailor(state, {
      id,
      sailNumber: "99",
      boatClass: "ILCA 7",
      name: "Ana Gómez",
      category: "Master",
      club: "YCA",
      celular: "222",
      dni: "12.345.678"
    });
    expect(result.error).toBeUndefined();
    expect(result.state!.sailors[0]).toMatchObject({
      sailNumber: "99",
      boatClass: "ILCA 7",
      club: "YCA",
      celular: "222",
      dni: "12345678",
      fechas: [fecha]
    });
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

  it("junta la misma persona anotada en dos celulares y alinea fechas al calendario", () => {
    const local = defaultState();
    local.sailors = [sailor({ id: "local", sailNumber: "7", name: "Ana", fechas: ["f1"], updatedAt: 10 })];
    const remote = saveFecha(defaultState(), {
      id: "",
      name: "Fecha 2",
      date: "2026-11-02",
      time: "12:00",
      avisos: ""
    }).state!;
    const f2 = remote.events.find((event) => event.name === "Fecha 2")!.id;
    remote.sailors = [sailor({ id: "remote", sailNumber: "7", name: "ana ", fechas: [f2], updatedAt: 20 })];
    const merged = mergeRemote(local, cloudRow(remote));
    expect(merged.sailors).toHaveLength(1);
    expect(merged.sailors[0].id).toBe("remote");
    expect(merged.sailors[0].fechas).toEqual(["f1", f2]);
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

  it("guarda celular y DNI opcionales y los replica en el payload de Appwrite", () => {
    let state = defaultState();
    const fecha = state.events[0].id;
    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana Gómez",
      category: "General",
      club: "CNA",
      celular: "11 5555-1212",
      dni: "12.345.678",
      fecha
    }).state;
    expect(state.sailors[0]).toMatchObject({ celular: "11 5555-1212", dni: "12345678" });
    const packed = JSON.parse(cloudRow(state).sailors as string) as Sailor[];
    expect(packed[0]).toMatchObject({ celular: "11 5555-1212", dni: "12345678" });

    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana Gómez",
      category: "General",
      club: "CNA",
      fecha
    }).state;
    expect(state.sailors[0]).toMatchObject({ celular: "11 5555-1212", dni: "12345678" });

    const otherPhone = defaultState();
    otherPhone.sailors = [
      sailor({ id: state.sailors[0].id, sailNumber: "ARG 1", name: "Ana Gómez", updatedAt: 1 })
    ];
    const merged = mergeRemote(otherPhone, cloudRow(state));
    expect(merged.sailors[0]).toMatchObject({ celular: "11 5555-1212", dni: "12345678" });
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

describe("inscripción competidor", () => {
  it("upcomingFechaId elige la primera fecha no cerrada (hoy incluido)", () => {
    const events = [
      makeFecha({ id: "f1", name: "Fecha 1", date: "2026-06-01" }),
      makeFecha({ id: "f2", name: "Fecha 2", date: "2026-06-20" }),
      makeFecha({ id: "f3", name: "Fecha 3", date: "2026-07-01" })
    ];
    expect(upcomingFechaId(events, "2026-06-15")).toBe("f2");
    expect(upcomingFechaId(events, "2026-06-20")).toBe("f2");
    expect(upcomingFechaId(events, "2026-08-01")).toBe("f3");
    const loaded = normalizeLoadedState({
      fecha: "f1",
      events,
      sailors: [],
      classFilter: "ALL",
      whatsappUrl: "",
      classes: [],
      removedSailors: [],
      removedFechas: [],
      whatsappAt: 0,
      classesAt: 0
    });
    expect(resolveActiveFecha(loaded, "2026-06-15")).toBe("f2");
  });

  it("tras inscribirse muestra la próxima fecha aunque el formulario use otra de referencia", () => {
    let state = defaultState();
    state.events[0].date = "2020-01-01";
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2030-06-01",
      time: "12:00",
      avisos: ""
    }).state!;
    const f1 = state.events[0].id;
    const f2 = state.events.find((event) => event.name === "Fecha 2")!.id;
    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fecha: f1
    }).state;
    expect(state.fecha).toBe(f2);
  });

  it("fecha pasada cierra inscripción; mismo día o futuro no", () => {
    expect(isFechaRegistrationClosed(makeFecha({ date: "2020-06-01" }), "2025-06-02")).toBe(true);
    expect(isFechaRegistrationClosed(makeFecha({ date: "2025-06-02" }), "2025-06-02")).toBe(false);
    expect(isFechaRegistrationClosed(makeFecha({ date: "2025-06-03" }), "2025-06-02")).toBe(false);
    expect(isFechaRegistrationClosed(makeFecha({ date: "" }), "2025-06-02")).toBe(false);
  });

  it("al crear una fecha nueva todos los competidores aparecen inscriptos en la UI de esa fecha", () => {
    let state = defaultState();
    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fecha: state.events[0].id
    }).state;
    state = {
      ...state,
      sailors: [{ ...state.sailors[0], fechas: [state.events[0].id] }]
    };
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2026-12-01",
      time: "12:00",
      avisos: ""
    }).state!;
    const f2 = state.events.find((event) => event.name === "Fecha 2")!.id;
    expect(sailorsInFecha(state, f2).map((item) => item.name)).toEqual(["Ana"]);
    expect(state.sailors[0].fechas).toEqual(state.events.map((event) => event.id));
  });

  it("al inscribirse queda anotado en todas las fechas del campeonato", () => {
    let state = defaultState();
    const f1 = state.events[0].id;
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2026-12-01",
      time: "12:00",
      avisos: ""
    }).state!;
    const f2 = state.events.find((event) => event.name === "Fecha 2")!.id;
    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fecha: f2
    }).state;
    expect(state.sailors[0].fechas).toEqual([f1, f2]);
  });

  it("inscripción tardía suma DNC en fechas pasadas con resultados ya cargados", () => {
    let state = defaultState();
    const f1 = state.events[0].id;
    state.events[0].date = "2020-06-01";
    state.events[0].racesCount = 1;
    state = saveFecha(state, {
      id: "",
      name: "Fecha 2",
      date: "2030-01-01",
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
        }
      ]
    };
    state.events.find((event) => event.id === f1)!.scores = { a: ["1"] };
    state = registerSailor(state, {
      sailNumber: "2",
      boatClass: "ILCA 6",
      name: "Beto",
      category: "General",
      club: "CNA",
      fecha: f2
    }).state;
    const beto = state.sailors.find((item) => item.name === "Beto")!;
    expect(beto.fechas).toEqual([f1, f2]);
    const today = "2025-06-02";
    expect(dateNet(state, beto, f1, today).net).toBe(3);
    expect(dateNet(state, beto, f2, today).net).toBe(0);
    const overall = rankedOverall({ ...state, classFilter: "ILCA 6" });
    expect(overall.find((item) => item.id === beto.id)?.breakdown).toEqual([3]);
  });

  it("fecha pasada sin carga publicada aplica DNC sobre regatas previstas en clasificación final", () => {
    let state = defaultState();
    const f1 = state.events[0].id;
    state.events[0].date = "2020-06-01";
    state.events[0].racesCount = 2;
    state.events[0].discardsAllowed = 0;
    state = registerSailor(state, {
      sailNumber: "ARG 1",
      boatClass: "ILCA 6",
      name: "Ana",
      category: "General",
      club: "CNA",
      fecha: f1
    }).state;
    const today = "2025-06-02";
    expect(fechaResultsStarted(state.events[0])).toBe(false);
    expect(dateNet(state, state.sailors[0], f1, today).net).toBe(4);
  });
});
