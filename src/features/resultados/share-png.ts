import html2canvas from "html2canvas";

export async function shareCardPng(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, {
    backgroundColor: "#073A5A",
    scale: 2,
    useCORS: true
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "failed" as const;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "aborted" as const;
    }
  }
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  return "downloaded" as const;
}
