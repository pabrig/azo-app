const ILCA_LOGO = "/assets/classes/ilca.png";
const OPTIMIST_LOGO = "/assets/classes/optimist.png";

/** Logos oficiales solo donde existen assets; el resto sin icono. */
export function classLogoSrc(className: string): string | null {
  const name = className.trim();
  if (name === "ILCA 6" || name === "ILCA 7") return ILCA_LOGO;
  if (name === "Optimist") return OPTIMIST_LOGO;
  return null;
}
