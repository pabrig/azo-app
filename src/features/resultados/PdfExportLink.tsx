import { downloadResultsPdf, type ResultsPdfInput } from "../../data/results-pdf";

export function PdfExportLink({
  disabled,
  payload
}: {
  disabled?: boolean;
  payload: Omit<ResultsPdfInput, "filename"> & { filename: string };
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="results-pdf-link"
      onClick={() => downloadResultsPdf(payload)}
    >
      Descargar PDF
    </button>
  );
}
