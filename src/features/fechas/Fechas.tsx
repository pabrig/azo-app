import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import { downloadDoc } from "../../data/download-doc";
import { readFileAsDataUrl } from "../../data/read-file";
import { DEFAULT_AVISOS, DEFAULT_CLASS_CATEGORIES } from "../../domain/defaults";
import { boatClasses, officialWhatsApp, suggestNextFechaName } from "../../domain/model";
import { FechasView, type ClassFormState, type FechaFormState } from "./Fechas.view";

const emptyFecha = (): FechaFormState => ({
  id: "",
  name: "",
  date: "",
  time: "12:00",
  avisos: DEFAULT_AVISOS,
  discardsAllowed: 1
});

const emptyClass = (): ClassFormState => ({
  original: "",
  name: "",
  categories: DEFAULT_CLASS_CATEGORIES.join(", ")
});

function docHint(name?: string) {
  return name
    ? `Actual: ${name}. Si no elegís un PDF, se mantiene.`
    : "Subí un PDF. Si no elegís archivo, se mantiene el actual.";
}

function pdfUpload(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.size) return undefined;
  const pdf = value.type === "application/pdf" || value.name.toLowerCase().endsWith(".pdf");
  if (!pdf) throw new Error("AR e IR se publican en PDF");
  const name = value.name.toLowerCase().endsWith(".pdf") ? value.name : `${value.name}.pdf`;
  return { name, file: value };
}

export function Fechas() {
  const api = useChampionship();
  const classes = boatClasses(api.state);
  const [whatsappUrl, setWhatsappUrl] = useState(() => officialWhatsApp(api.state));
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClass);
  const [fechaForm, setFechaForm] = useState<FechaFormState>(emptyFecha);
  const [fileEpoch, setFileEpoch] = useState(0);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);
  const fechaFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (document.activeElement === whatsappRef.current) return;
    setWhatsappUrl(officialWhatsApp(api.state));
  }, [api.state]);

  useEffect(() => {
    if (!api.whatsappFocus) return;
    whatsappRef.current?.focus();
    whatsappRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [api.whatsappFocus]);

  function resetFecha() {
    setFechaForm(emptyFecha());
    setFileEpoch((current) => current + 1);
  }

  function beginNewFecha() {
    const name = suggestNextFechaName(api.state.events);
    setFechaForm({ ...emptyFecha(), name });
    setFileEpoch((current) => current + 1);
    fechaFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSaveFecha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const arFile = data.get("ar");
    const irFile = data.get("ir");
    try {
      const arUpload = pdfUpload(arFile);
      const irUpload = pdfUpload(irFile);
      const ar = arUpload ? { name: arUpload.name, dataUrl: await readFileAsDataUrl(arUpload.file) } : undefined;
      const ir = irUpload ? { name: irUpload.name, dataUrl: await readFileAsDataUrl(irUpload.file) } : undefined;
      const saved = api.saveFecha({ ...fechaForm, ar, ir });
      if (saved) resetFecha();
    } catch (error) {
      api.showToast(error instanceof Error ? error.message : "No se pudo leer el archivo");
    }
  }

  return (
    <FechasView
      isAdmin={api.isAdmin}
      classes={classes}
      events={api.state.events}
      whatsappUrl={whatsappUrl}
      whatsappRef={whatsappRef}
      onWhatsappUrl={setWhatsappUrl}
      onSaveWhatsapp={(event) => {
        event.preventDefault();
        api.saveWhatsapp(whatsappUrl);
      }}
      classForm={classForm}
      classFormRef={classFormRef}
      onClassForm={(patch) => setClassForm((current) => ({ ...current, ...patch }))}
      onSaveClass={(event) => {
        event.preventDefault();
        const saved = api.saveBoatClass({
          name: classForm.name,
          original: classForm.original,
          categories: classForm.categories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        });
        if (saved) setClassForm(emptyClass());
      }}
      onEditClass={(name) => {
        const found = classes.find((item) => item.name === name);
        if (!found) return;
        setClassForm({ original: found.name, name: found.name, categories: found.categories.join(", ") });
        classFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      onDeleteClass={(name) => {
        if (classes.length <= 1) {
          api.showToast("Debe quedar al menos una clase");
          return;
        }
        const used = api.state.sailors.filter((sailor) => sailor.boatClass === name).length;
        const accepted = used
          ? window.confirm(
              `Hay ${used} inscripto(s) en ${name}. Si borrás la clase, pasan a la primera clase restante (no depende de fechas). ¿Continuar?`
            )
          : window.confirm(`¿Borrar la clase ${name}?`);
        if (accepted && !api.deleteBoatClass(name)) return;
      }}
      fechaForm={fechaForm}
      fechaFormRef={fechaFormRef}
      fechaIsEdit={Boolean(fechaForm.id)}
      fileEpoch={fileEpoch}
      onBeginNewFecha={beginNewFecha}
      arHint={docHint(api.state.events.find((event) => event.id === fechaForm.id)?.ar?.name)}
      irHint={docHint(api.state.events.find((event) => event.id === fechaForm.id)?.ir?.name)}
      onFechaForm={(patch) => setFechaForm((current) => ({ ...current, ...patch }))}
      onSaveFecha={onSaveFecha}
      onResetFecha={resetFecha}
      onEditFecha={(id) => {
        const event = api.state.events.find((item) => item.id === id);
        if (!event) return;
        setFechaForm({
          id: event.id,
          name: event.name,
          date: event.date,
          time: event.time,
          avisos: event.avisos || "",
          discardsAllowed: event.discardsAllowed ?? (event.racesCount >= 4 ? 1 : 0)
        });
        setFileEpoch((current) => current + 1);
        fechaFormRef.current?.scrollIntoView({ behavior: "smooth" });
      }}
      onDeleteFecha={(id) => {
        if (api.state.events.length <= 1) {
          api.showToast("Dejá al menos una fecha");
          return;
        }
        const event = api.state.events.find((item) => item.id === id);
        const label = event?.name || "esta fecha";
        if (!window.confirm(`¿Eliminar ${label} y sus resultados? No se puede deshacer.`)) return;
        api.deleteFecha(id);
      }}
      onDownload={(id, kind) => {
        const event = api.state.events.find((item) => item.id === id);
        const doc = event?.[kind];
        if (!downloadDoc(doc, kind === "ar" ? "AR.pdf" : "IR.pdf")) api.showToast("No hay archivo cargado");
      }}
    />
  );
}
