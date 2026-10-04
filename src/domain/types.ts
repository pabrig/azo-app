export const PENALTY_CODES = ["DNC", "DNS", "OCS", "DNF", "DSQ"] as const;

export type PenaltyCode = (typeof PENALTY_CODES)[number];

export type RaceDoc = {
  name: string;
  href?: string;
  dataUrl?: string;
};

export type Fecha = {
  id: string;
  name: string;
  date: string;
  time: string;
  avisos: string;
  ar: RaceDoc;
  ir: RaceDoc;
  racesCount: number;
  scores: Record<string, Array<string | null>>;
};

export type BoatClass = {
  name: string;
  categories: string[];
};

export type Sailor = {
  id: string;
  sailNumber: string;
  boatClass: string;
  name: string;
  category: string;
  club: string;
  fechas?: string[];
};

export type ChampionshipState = {
  fecha: string;
  classFilter: string;
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string;
  classes: BoatClass[];
};

export type SyncMode = "live" | "error" | "local";

export type TabId = "inscripcion" | "fechas" | "carga" | "placa" | "ranking";

export type DateNet = {
  racePts: number[];
  raw: Array<string | null | undefined>;
  net: number;
  discarded: number | null;
};

export type RankedSailor = Sailor & DateNet;

export type OverallSailor = Sailor & {
  breakdown: number[];
  net: number;
};

export type RegisterInput = {
  sailNumber: string;
  boatClass: string;
  name: string;
  category: string;
  club: string;
  fecha: string;
};

export type FechaSaveInput = {
  id: string;
  name: string;
  date: string;
  time: string;
  avisos: string;
  ar?: RaceDoc;
  ir?: RaceDoc;
};

export type ClassSaveInput = {
  name: string;
  original: string;
  categories: string[];
};
