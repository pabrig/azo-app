export type WeatherConditionKind = "sun" | "cloud" | "rain" | "storm" | "fog" | "unknown";

/** Etiquetas WMO (Open-Meteo) en castellano, orientadas al timonel. */
export function weatherCodeSummary(code: number): { kind: WeatherConditionKind; label: string } {
  if (code === 0) return { kind: "sun", label: "Despejado" };
  if (code === 1) return { kind: "sun", label: "Mayormente despejado" };
  if (code === 2) return { kind: "cloud", label: "Parcialmente nublado" };
  if (code === 3) return { kind: "cloud", label: "Nublado" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Niebla" };
  if (code >= 51 && code <= 57) return { kind: "rain", label: "Llovizna" };
  if (code >= 61 && code <= 67) return { kind: "rain", label: "Lluvia" };
  if (code >= 71 && code <= 77) return { kind: "cloud", label: "Nieve / granizo" };
  if (code >= 80 && code <= 82) return { kind: "rain", label: "Chaparrones" };
  if (code === 85 || code === 86) return { kind: "rain", label: "Chaparrones de nieve" };
  if (code >= 95 && code <= 99) return { kind: "storm", label: "Tormenta" };
  return { kind: "unknown", label: "Variable" };
}
