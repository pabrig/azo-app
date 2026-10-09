/**
 * Clases oficiales del campeonato: ILCA 6, ILCA 7, etc.
 * Planillas/PDF usan alias (Laser radial, Laser std) → misma flota y neto.
 */
const CLASS_CANONICAL: Record<string, string> = {
  "laser radial": "ILCA 6",
  "láser radial": "ILCA 6",
  "ilca radial": "ILCA 6",
  "laser std": "ILCA 7",
  "láser std": "ILCA 7",
  "ilca std": "ILCA 7",
  "laser standard": "ILCA 7",
  "laser 6": "ILCA 6",
  "laser 7": "ILCA 7",
  "ilca 6": "ILCA 6",
  "ilca 7": "ILCA 7"
};

export function canonicalBoatClassName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  return CLASS_CANONICAL[key] ?? trimmed;
}

export function sameBoatClass(a: string, b: string) {
  return canonicalBoatClassName(a) === canonicalBoatClassName(b);
}
