import html2canvas from "html2canvas";

export type PngExport = {
  blob: Blob;
  blobUrl: string;
  filename: string;
};

export async function renderCardPng(node: HTMLElement, filename: string): Promise<PngExport | null> {
  const canvas = await html2canvas(node, {
    backgroundColor: "#073A5A",
    scale: 2,
    useCORS: true,
    logging: false
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return { blob, blobUrl: URL.createObjectURL(blob), filename };
}

export function revokePngExport(exp: PngExport) {
  URL.revokeObjectURL(exp.blobUrl);
}

export async function sharePngExport(exp: PngExport): Promise<"shared" | "aborted" | "unsupported"> {
  const file = new File([exp.blob], exp.filename, { type: "image/png" });
  if (!navigator.canShare?.({ files: [file] })) return "unsupported";
  try {
    await navigator.share({
      files: [file],
      title: exp.filename.replace(/\.png$/i, ""),
      text: "Comprobante CNA — Club Náutico Avellaneda"
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "aborted";
    return "unsupported";
  }
}

export function downloadPngExport(exp: PngExport) {
  const link = document.createElement("a");
  link.download = exp.filename;
  link.href = exp.blobUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** @deprecated Usar renderCardPng + sharePngExport / downloadPngExport */
export async function shareCardPng(node: HTMLElement, filename: string) {
  const exp = await renderCardPng(node, filename);
  if (!exp) return "failed" as const;
  const shared = await sharePngExport(exp);
  if (shared === "shared" || shared === "aborted") {
    revokePngExport(exp);
    return shared === "shared" ? ("shared" as const) : ("aborted" as const);
  }
  downloadPngExport(exp);
  setTimeout(() => revokePngExport(exp), 60_000);
  return "downloaded" as const;
}
