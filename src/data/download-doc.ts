import type { RaceDoc } from "../domain/types";

export function downloadDoc(doc: RaceDoc | undefined, fallbackName: string) {
  const href = doc?.dataUrl || doc?.href;
  if (!href) return false;
  const link = document.createElement("a");
  link.href = href;
  link.download = doc?.name || fallbackName;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
  return true;
}
