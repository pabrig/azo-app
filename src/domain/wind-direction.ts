const COMPASS_16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO"
] as const;

/** Dirección meteorológica (de donde viene el viento). */
export function windDirectionFromDegrees(degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_16[index];
}

/** Rotación CSS para flecha “hacia donde sopla” (opuesto al origen). */
export function windArrowRotationDeg(degrees: number) {
  return ((degrees + 180) % 360);
}
