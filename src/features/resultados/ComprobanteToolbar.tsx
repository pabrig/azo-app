import { useEffect, useState, type RefObject } from "react";
import {
  downloadPngExport,
  renderCardPng,
  revokePngExport,
  sharePngExport,
  type PngExport
} from "./share-png";

export function ComprobanteToolbar({
  cardRef,
  filename,
  onToast
}: {
  cardRef: RefObject<HTMLElement | null>;
  filename: string;
  onToast: (message: string) => void;
}) {
  const [preview, setPreview] = useState<PngExport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) revokePngExport(preview);
    };
  }, [preview]);

  function closePreview() {
    if (preview) revokePngExport(preview);
    setPreview(null);
  }

  async function generate() {
    const node = cardRef.current;
    if (!node || busy) return;
    setBusy(true);
    onToast("Generando comprobante…");
    try {
      if (preview) {
        revokePngExport(preview);
        setPreview(null);
      }
      const exp = await renderCardPng(node, filename);
      if (!exp) {
        onToast("No se pudo generar la imagen");
        return;
      }
      setPreview(exp);
      onToast("Imagen lista — compartila o guardala");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!preview) return;
    const result = await sharePngExport(preview);
    if (result === "shared") onToast("Elegí WhatsApp u otra app en el menú");
    else if (result === "aborted") return;
    else {
      downloadPngExport(preview);
      onToast("Descarga iniciada: adjuntá el PNG en WhatsApp");
    }
  }

  function save() {
    if (!preview) return;
    downloadPngExport(preview);
    onToast("Guardado: buscá el archivo en Descargas o Archivos");
  }

  return (
    <div className="comprobante-toolbar space-y-3">
      <p className="hidden lg:block text-[11px] font-semibold text-slate-300">Comprobante PNG</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void generate()}
        className="w-full bg-cyan-500 text-sea-900 font-bold text-sm lg:text-[13px] py-3 lg:py-2.5 rounded-xl disabled:opacity-60"
      >
        {preview ? "Regenerar comprobante PNG" : "Generar comprobante PNG"}
      </button>

      {preview ? (
        <div className="rounded-2xl border border-cyan-500/30 bg-sea-800/80 p-3 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Vista previa del comprobante. En el celular usá Compartir (WhatsApp) o Guardar PNG y adjuntalo en el chat.
          </p>
          <img
            src={preview.blobUrl}
            alt="Vista previa del comprobante"
            className="w-full rounded-xl border border-white/10"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void share()}
              className="bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Compartir…
            </button>
            <button type="button" onClick={save} className="bg-white/10 font-bold py-2.5 rounded-xl text-xs">
              Guardar PNG
            </button>
          </div>
          <button type="button" onClick={closePreview} className="w-full text-[11px] text-slate-500 py-1">
            Cerrar vista previa
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 px-0.5">
          Generá la imagen antes de compartir. Si WhatsApp no aparece solo, guardá el PNG y adjuntalo desde el chat.
        </p>
      )}
    </div>
  );
}
