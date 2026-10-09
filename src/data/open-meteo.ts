import { weatherVenue } from "../config";
import { weatherCodeSummary } from "../domain/weather-codes";
import { windDirectionFromDegrees } from "../domain/wind-direction";

export type FechaWeatherSnapshot = {
  windKts: number;
  gustKts: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  tempC: number;
  tempMinC: number;
  tempMaxC: number;
  conditionLabel: string;
  conditionKind: ReturnType<typeof weatherCodeSummary>["kind"];
  precipProb: number;
  slotTime: string;
};

type ForecastResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    wind_direction_10m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

const CACHE_MS = 45 * 60 * 1000;
const cache = new Map<string, { at: number; value: FechaWeatherSnapshot }>();

function cacheKey(date: string, hour: number) {
  return `v2,${weatherVenue.latitude},${weatherVenue.longitude},${date},${hour}`;
}

export function parseFechaTime(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 12;
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  return Number.isFinite(hour) ? hour : 12;
}

function pickHourIndex(times: string[], date: string, hour: number) {
  const prefix = `${date}T`;
  let best = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  times.forEach((slot, index) => {
    if (!slot.startsWith(prefix)) return;
    const hourPart = parseInt(slot.slice(11, 13), 10);
    if (!Number.isFinite(hourPart)) return;
    const diff = Math.abs(hourPart - hour);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index;
    }
  });
  return best;
}

function roundKts(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

function roundTemp(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

export async function fetchFechaWeather(date: string, time: string, signal?: AbortSignal): Promise<FechaWeatherSnapshot> {
  const hour = parseFechaTime(time);
  const key = cacheKey(date, hour);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const params = new URLSearchParams({
    latitude: String(weatherVenue.latitude),
    longitude: String(weatherVenue.longitude),
    elevation: String(weatherVenue.elevation ?? 0),
    hourly: "temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min",
    /** Open-Meteo: kn para wind_speed_10m y wind_gusts_10m (sin conversión local). */
    wind_speed_unit: "kn",
    timezone: weatherVenue.timezone,
    start_date: date,
    end_date: date
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  const json = (await response.json()) as ForecastResponse & { error?: boolean; reason?: string };
  if (!response.ok || json.error) throw new Error(json.reason || "No se pudo obtener el pronóstico");
  const times = json.hourly?.time;
  if (!times?.length) throw new Error("Sin datos horarios para ese día");

  const index = pickHourIndex(times, date, hour);
  if (index < 0) throw new Error("Sin pronóstico para ese horario");

  const dailyIndex = json.daily?.time?.findIndex((day) => day === date) ?? 0;
  const tempMinC = roundTemp(json.daily?.temperature_2m_min?.[dailyIndex >= 0 ? dailyIndex : 0]);
  const tempMaxC = roundTemp(json.daily?.temperature_2m_max?.[dailyIndex >= 0 ? dailyIndex : 0]);

  const windDirectionDeg = json.hourly?.wind_direction_10m?.[index] ?? 0;
  const code = json.hourly?.weather_code?.[index] ?? 0;
  const summary = weatherCodeSummary(code);
  const value: FechaWeatherSnapshot = {
    windKts: roundKts(json.hourly?.wind_speed_10m?.[index]),
    gustKts: roundKts(json.hourly?.wind_gusts_10m?.[index]),
    windDirectionDeg,
    windDirectionLabel: windDirectionFromDegrees(windDirectionDeg),
    tempC: roundTemp(json.hourly?.temperature_2m?.[index]),
    tempMinC,
    tempMaxC,
    conditionLabel: summary.label,
    conditionKind: summary.kind,
    precipProb: roundTemp(json.hourly?.precipitation_probability?.[index]),
    slotTime: times[index].slice(11, 16)
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
