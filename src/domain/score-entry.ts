import { PENALTY_CODES, type PenaltyCode } from "./types";

/** Opciones de penalización en el desplegable de Carga (valor RRS → etiqueta comisión). */
export const COMMISSION_PENALTY_OPTIONS: readonly { value: PenaltyCode; label: string }[] = [
  { value: "DNC", label: "DNC" },
  { value: "DNS", label: "DNS" },
  { value: "OCS", label: "OCS" },
  { value: "DNF", label: "DNF" },
  { value: "DSQ", label: "Descalificado" },
  { value: "DNE", label: "DNE" }
];

const PENALTY_ALIASES: Record<string, PenaltyCode> = {
  descalificado: "DSQ",
  descalificada: "DSQ",
  descalificacion: "DSQ",
  desclasificado: "DSQ",
  dsq: "DSQ",
  dnc: "DNC",
  dns: "DNS",
  ocs: "OCS",
  dnf: "DNF",
  dne: "DNE"
};

function aliasKey(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Normaliza lo que elige o escribe la comisión a puesto numérico o código RRS. */
export function normalizeScoreEntry(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if ((PENALTY_CODES as readonly string[]).includes(upper)) return upper;
  const alias = PENALTY_ALIASES[aliasKey(trimmed)];
  if (alias) return alias;
  if (/^\d+$/.test(trimmed)) {
    const position = parseInt(trimmed, 10);
    if (position > 0) return String(position);
  }
  return upper;
}

export function canonicalScoreCell(cell: string | null | undefined): string {
  if (cell === null || cell === undefined || cell === "") return "";
  return normalizeScoreEntry(String(cell)) ?? String(cell).trim().toUpperCase();
}
