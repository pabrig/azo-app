import { describe, expect, it } from "vitest";
import { parseFechaTime } from "../data/open-meteo";
import { fechaShowsWeather } from "../features/clima/useFechaWeather";
import { weatherCodeSummary } from "./weather-codes";
import { windDirectionFromDegrees } from "./wind-direction";
import type { Fecha } from "./types";

describe("pronóstico", () => {
  it("convierte grados a punto cardinal", () => {
    expect(windDirectionFromDegrees(0)).toBe("N");
    expect(windDirectionFromDegrees(90)).toBe("E");
  });

  it("interpreta horario de la fecha", () => {
    expect(parseFechaTime("12:00")).toBe(12);
    expect(parseFechaTime("9:30")).toBe(9);
    expect(parseFechaTime("")).toBe(12);
  });

  it("oculta pronóstico si la fecha ya pasó", () => {
    expect(fechaShowsWeather({ date: "2000-01-01" } as Fecha)).toBe(false);
    expect(fechaShowsWeather({ date: "2099-12-31" } as Fecha)).toBe(true);
    expect(fechaShowsWeather(null)).toBe(false);
  });

  it("resume códigos WMO en castellano", () => {
    expect(weatherCodeSummary(0).label).toMatch(/Despejado/);
    expect(weatherCodeSummary(61).kind).toBe("rain");
    expect(weatherCodeSummary(95).kind).toBe("storm");
  });
});
