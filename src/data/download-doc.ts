import { bundledDoc } from "../domain/defaults";
import type { RaceDoc } from "../domain/types";

function pdfFileName(name: string) {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name.replace(/\.(docx?)$/i, "")}.pdf`;
}

export function downloadDoc(doc: RaceDoc | undefined, fallbackName: string) {
  const kind = fallbackName.toLowerCase().startsWith("ir") ? "ir" : "ar";
  const resolved = doc?.dataUrl ? doc : bundledDoc(doc, kind);
  const href = resolved.dataUrl || resolved.href;
  if (!href) return false;
  const storedName = resolved.name || fallbackName;
  const isPdf =
    storedName.toLowerCase().endsWith(".pdf") ||
    href.toLowerCase().split("?")[0].endsWith(".pdf") ||
    href.startsWith("data:application/pdf");
  const link = document.createElement("a");
  link.href = href;
  link.download = isPdf ? pdfFileName(storedName) : storedName;
  link.rel = "noopener";
  link.click();
  return true;
}
