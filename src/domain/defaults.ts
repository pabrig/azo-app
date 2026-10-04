import type { BoatClass, RaceDoc } from "./types";

export const DEFAULT_BOAT_CLASSES: BoatClass[] = [
  {
    name: "ILCA 7",
    categories: ["General", "Apprentice", "Master", "Grand Master", "Great Grand Master"]
  },
  {
    name: "ILCA 6",
    categories: [
      "General",
      "Junior",
      "Apprentice",
      "Master",
      "Grand Master",
      "Great Grand Master",
      "Femenino"
    ]
  },
  { name: "ILCA 4", categories: ["General", "Junior", "Cadete", "Femenino"] },
  { name: "Pampero", categories: ["General", "Mixto", "Femenino", "Promocional"] },
  { name: "Otras", categories: ["General", "Libre"] }
];

export const DEFAULT_AR: RaceDoc = {
  name: "AR_VELA_LIGERA.docx",
  href: "/docs/AR_VELA_LIGERA.docx"
};

export const DEFAULT_IR: RaceDoc = {
  name: "IR_VELA_LIGERA.docx",
  href: "/docs/IR_VELA_LIGERA.docx"
};

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
