import type { ResultRow } from "../ui/ResultsCard";

export type ResultsPdfInput = {
  title: string;
  classLabel: string;
  year: string;
  stamp: string;
  columns: string[];
  rows: ResultRow[];
  filename: string;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 36;

function pdfEscape(text: string) {
  let out = "";
  for (const ch of text) {
    const mapped = toWinAnsi(ch);
    if (mapped === 40 || mapped === 41 || mapped === 92) out += `\\${String.fromCharCode(mapped)}`;
    else if (mapped < 32 || mapped > 126) out += `\\${mapped.toString(8).padStart(3, "0")}`;
    else out += String.fromCharCode(mapped);
  }
  return out;
}

function toWinAnsi(ch: string) {
  const map: Record<string, number> = {
    "\u00C1": 193,
    "\u00C9": 201,
    "\u00CD": 205,
    "\u00D3": 211,
    "\u00DA": 218,
    "\u00E1": 225,
    "\u00E9": 233,
    "\u00ED": 237,
    "\u00F3": 243,
    "\u00FA": 250,
    "\u00D1": 209,
    "\u00F1": 241,
    "\u00DC": 220,
    "\u00FC": 252,
    "\u00BF": 191,
    "\u00A1": 161,
    "\u00BA": 186,
    "\u00B0": 176
  };
  if (map[ch] !== undefined) return map[ch];
  const code = ch.charCodeAt(0);
  return code < 256 ? code : 63;
}

function wrap(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function streamForPage(input: ResultsPdfInput, startRow: number, yStart: number) {
  const lines: string[] = ["BT", "/F1 11 Tf", `1 0 0 1 ${MARGIN} ${yStart} Tm`, `(${pdfEscape(input.title)}) Tj`];
  lines.push("0 -14 Td", "/F1 8 Tf", `(${pdfEscape(`${input.classLabel}  ·  ${input.year}`)}) Tj`);
  const headers = ["Pos", "Vela", "Timonel", ...input.columns, "Net"];
  const colW = Math.min(72, (PAGE_W - MARGIN * 2) / Math.max(headers.length, 1));
  lines.push("0 -22 Td", "/F1 7 Tf");
  headers.forEach((header, index) => {
    lines.push(`${index === 0 ? "0 0" : `${colW} 0`} Td (${pdfEscape(wrap(header, 10))}) Tj`);
  });
  lines.push(`${-colW * (headers.length - 1)} -12 Td`);

  let count = 0;
  let y = yStart - 48;
  for (let i = startRow; i < input.rows.length; i += 1) {
    if (y < MARGIN + 28) break;
    const row = input.rows[i];
    const cells = [String(row.position), wrap(row.sailNumber, 12), wrap(row.name, 16), ...row.cells.map((c) => wrap(c, 10)), String(row.net)];
    cells.forEach((cell, index) => {
      lines.push(`${index === 0 ? "0 0" : `${colW} 0`} Td (${pdfEscape(cell)}) Tj`);
    });
    lines.push(`${-colW * (cells.length - 1)} -11 Td`);
    y -= 11;
    count += 1;
  }
  lines.push("ET");
  return { content: lines.join("\n"), rowsUsed: count };
}

function buildPdf(input: ResultsPdfInput): Uint8Array {
  const pages: string[] = [];
  let offset = 0;
  while (offset < input.rows.length || pages.length === 0) {
    const page = streamForPage(input, offset, PAGE_H - MARGIN);
    pages.push(page.content);
    if (!page.rowsUsed) break;
    offset += page.rowsUsed;
    if (!input.rows.length) break;
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((content, i) => {
    const contentNum = 4 + i * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  let pdf = "%PDF-1.4\n";
  const xref: number[] = [0];
  objects.forEach((body, index) => {
    xref.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  xref.slice(1).forEach((pos) => {
    pdf += `${String(pos).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadResultsPdf(input: ResultsPdfInput) {
  const bytes = buildPdf(input);
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = input.filename.endsWith(".pdf") ? input.filename : `${input.filename}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
