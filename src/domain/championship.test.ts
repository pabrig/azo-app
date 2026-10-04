import { describe, expect, it } from "vitest";
import { defaultState, migrateClasses, migrateEvents } from "./model";
import { dateNet, fleetSize, pointsFor, rankedForFecha } from "./scoring";
import { saveFecha, updateScore } from "./mutations";
import type { Sailor } from "./types";

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
