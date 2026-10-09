import { useCallback, useEffect, useState } from "react";
import { fetchFechaWeather, type FechaWeatherSnapshot } from "../../data/open-meteo";
import { todayLocalIso } from "../../domain/model";
import type { Fecha } from "../../domain/types";

const MAX_FORECAST_DAYS = 16;

function daysFromToday(isoDate: string) {
  const today = todayLocalIso();
  const start = new Date(`${today}T12:00:00`);
  const target = new Date(`${isoDate}T12:00:00`);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function fechaShowsWeather(event: Fecha | null) {
  if (!event?.date?.trim()) return false;
  return event.date >= todayLocalIso();
}

export function useFechaWeather(event: Fecha | null) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<FechaWeatherSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const show = fechaShowsWeather(event);

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!show || !event?.date?.trim()) {
        setSnapshot(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (daysFromToday(event.date) > MAX_FORECAST_DAYS) {
        setSnapshot(null);
        setError("Pronóstico disponible 16 días antes de la regata.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFechaWeather(event.date, event.time || "12:00", signal);
        setSnapshot(data);
      } catch (cause) {
        if (signal.aborted) return;
        setSnapshot(null);
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el pronóstico");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [event?.date, event?.time, show]
  );

  useEffect(() => {
    if (!show) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, show, tick]);

  return { show, loading, snapshot, error, retry: () => setTick((n) => n + 1) };
}
