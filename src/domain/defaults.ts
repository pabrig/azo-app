import type { BoatClass, RaceDoc } from "./types";

/** Categorías sugeridas al crear una clase (la comisión puede agregar más). */
export const DEFAULT_CLASS_CATEGORIES = ["Masculino", "Femenino", "General"] as const;

export const DEFAULT_BOAT_CLASSES: BoatClass[] = [
  { name: "ILCA 7", categories: [...DEFAULT_CLASS_CATEGORIES] },
  { name: "ILCA 6", categories: [...DEFAULT_CLASS_CATEGORIES] },
  { name: "ILCA 4", categories: [...DEFAULT_CLASS_CATEGORIES] },
  { name: "Pampero", categories: [...DEFAULT_CLASS_CATEGORIES] },
  { name: "Otras", categories: [...DEFAULT_CLASS_CATEGORIES] }
];

export function normalizeClassCategories(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const source = raw.length ? raw : [...DEFAULT_CLASS_CATEGORIES];
  for (const item of source) {
    const label = item.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.length ? out : [...DEFAULT_CLASS_CATEGORIES];
}

function hasCategory(categories: string[], label: string) {
  const key = label.toLowerCase();
  return categories.some((item) => item.toLowerCase() === key);
}

/** Clases guardadas antes del esquema Masculino / Femenino / General. */
export function isLegacyClassCategories(categories: string[]): boolean {
  if (!categories.length) return true;
  return (
    !hasCategory(categories, "Masculino") ||
    !hasCategory(categories, "Femenino") ||
    !hasCategory(categories, "General")
  );
}

/** Al cargar o sincronizar: suma el trío nuevo sin borrar categorías extra (Master, Cadete…). */
export function migrateClassCategories(categories: string[]): string[] {
  const normalized = normalizeClassCategories(categories);
  if (!isLegacyClassCategories(normalized)) return normalized;
  return normalizeClassCategories([...DEFAULT_CLASS_CATEGORIES, ...normalized]);
}

export const DEFAULT_AR: RaceDoc = {
  name: "AR_VELA_LIGERA.pdf",
  href: "/docs/AR_VELA_LIGERA.pdf"
};

export const DEFAULT_IR: RaceDoc = {
  name: "IR_VELA_LIGERA.pdf",
  href: "/docs/IR_VELA_LIGERA.pdf"
};

function legacyPdf(doc: RaceDoc): RaceDoc | undefined {
  const href = doc.href || "";
  const name = doc.name || "";
  if (href.endsWith("AR_VELA_LIGERA.docx") || name === "AR_VELA_LIGERA.docx") return { ...DEFAULT_AR };
  if (href.endsWith("IR_VELA_LIGERA.docx") || name === "IR_VELA_LIGERA.docx") return { ...DEFAULT_IR };
  return undefined;
}

/** Las fechas ya publicadas apuntan al Word original. La descarga usa el PDF. */
export function bundledDoc(doc: RaceDoc | undefined, kind: "ar" | "ir"): RaceDoc {
  if (!doc) return defaultDoc(kind);
  if (doc.dataUrl) return doc;
  return legacyPdf(doc) || doc;
}

export const DEFAULT_WHATSAPP = "https://chat.whatsapp.com/EZWmFlBaIYZCyw7pdwecob";

export const DEFAULT_AVISOS = `Avisos de esta fecha (además del grupo oficial de WhatsApp).
Se prevén 3 regatas (válida con 2).
Cambios de IR: hasta 2 h antes de la largada.
Protestas: mismo grupo, hasta 1 h después del arribo a puerto.
Canal de seguridad: 68 (bandera V).`;

export function defaultBoatClasses(): BoatClass[] {
  return DEFAULT_BOAT_CLASSES.map((c) => ({
    name: c.name,
    categories: c.categories.slice()
  }));
}

export function defaultDoc(kind: "ar" | "ir"): RaceDoc {
  return kind === "ar" ? { ...DEFAULT_AR } : { ...DEFAULT_IR };
}
