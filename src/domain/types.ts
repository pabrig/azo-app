export const PENALTY_CODES = ["DNC", "DNS", "OCS", "DNF", "DSQ", "DNE"] as const;

/** RRS A9: no se descartan del series score (Ap. A). */
export const NON_DISCARDABLE_PENALTIES = ["DNE", "DSQ"] as const;

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
  /** Cantidad de peores regatas descartables en el neto de esta fecha (comisión). */
  discardsAllowed: number;
  scores: Record<string, Array<string | null>>;
  updatedAt?: number;
  scoreAt?: Record<string, number>;
};

export type RemovedFecha = {
  id: string;
  at: number;
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
  celular?: string;
  dni?: string;
  fechas?: string[];
  updatedAt?: number;
};

export type RemovedSailor = {
  sailNumber: string;
  boatClass: string;
  name?: string;
  at: number;
};

export type ChampionshipState = {
  fecha: string;
  classFilter: string;
  sailors: Sailor[];
  events: Fecha[];
  whatsappUrl: string;
  classes: BoatClass[];
  removedSailors: RemovedSailor[];
  removedFechas: RemovedFecha[];
  whatsappAt: number;
  classesAt: number;
};

export type SyncMode = "live" | "error" | "local";

export type TabId = "inscripcion" | "fechas" | "carga" | "placa" | "ranking";

export type DateNet = {
  racePts: number[];
  raw: Array<string | null | undefined>;
  net: number;
  discarded: number | null;
  /** Índices de regata cuyo puntaje se descartó en el neto de la fecha. */
  discardedRaceIndexes: number[];
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
  celular?: string;
  dni?: string;
  fecha: string;
};

export type SailorSaveInput = {
  id: string;
  sailNumber: string;
  boatClass: string;
  name: string;
  category: string;
  club: string;
  celular?: string;
  dni?: string;
};

export type FechaSaveInput = {
  id: string;
  name: string;
  date: string;
  time: string;
  avisos: string;
  racesCount?: number;
  discardsAllowed?: number;
  ar?: RaceDoc;
  ir?: RaceDoc;
};

export type ClassSaveInput = {
  name: string;
  original: string;
  categories: string[];
};
