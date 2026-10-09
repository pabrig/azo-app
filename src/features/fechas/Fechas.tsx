import { useRef, useState, type FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import { downloadDoc } from "../../data/download-doc";
import { readFileAsDataUrl } from "../../data/read-file";
import { DEFAULT_AVISOS, DEFAULT_CLASS_CATEGORIES } from "../../domain/defaults";
import { boatClasses, suggestNextFechaName } from "../../domain/model";
import { occupiedRaceCount } from "../../domain/race-slots";
import { useConfirm } from "../../ui/confirm";
import { FechasView, type ClassFormState, type FechaFormState } from "./Fechas.view";

const emptyFecha = (): FechaFormState => ({
  id: "",
  name: "",
  date: "",
  time: "12:00",
  avisos: DEFAULT_AVISOS,
  racesCount: 3,
  discardsAllowed: 1
});

const emptyClass = (): ClassFormState => ({
  original: "",
  name: "",
  categories: [...DEFAULT_CLASS_CATEGORIES]
});

function docHint(name?: string) {
  return name ? `Actual: ${name}. Si no elegís PDF, se mantiene.` : "Opcional. PDF.";
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
  const confirm = useConfirm();
  const classes = boatClasses(api.state);
  const [classForm, setClassForm] = useState<ClassFormState>(emptyClass);
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [fechaForm, setFechaForm] = useState<FechaFormState>(emptyFecha);
  const [creatingFecha, setCreatingFecha] = useState(false);
  const [fileEpoch, setFileEpoch] = useState(0);
  const fechaFormRef = useRef<HTMLFormElement>(null);

  const editingEvent = api.state.events.find((event) => event.id === fechaForm.id);
  const maxDiscards = Math.max(0, (fechaForm.racesCount || 3) - 1);

  function closeFechaEditor() {
    setCreatingFecha(false);
    setFechaForm(emptyFecha());
    setFileEpoch((current) => current + 1);
  }

  async function onSaveFecha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const occupied = editingEvent ? occupiedRaceCount(editingEvent) : 0;
      if (occupied > fechaForm.racesCount) {
        const ok = await confirm({
          title: "Quitar regatas",
          message: `Esta fecha ya tiene ${occupied} regatas con resultado. Si dejás ${fechaForm.racesCount}, se borran las últimas columnas y placa/ranking se recalculan. No se puede deshacer.`,
          confirmLabel: "Guardar",
          danger: true
        });
        if (!ok) return;
      }
      const arUpload = pdfUpload(data.get("ar"));
      const irUpload = pdfUpload(data.get("ir"));
      const ar = arUpload ? { name: arUpload.name, dataUrl: await readFileAsDataUrl(arUpload.file) } : undefined;
      const ir = irUpload ? { name: irUpload.name, dataUrl: await readFileAsDataUrl(irUpload.file) } : undefined;
      const saved = api.saveFecha({ ...fechaForm, ar, ir });
      if (saved) closeFechaEditor();
    } catch (error) {
      api.showToast(error instanceof Error ? error.message : "No se pudo leer el archivo");
    }
  }

  function toggleCategory(label: string) {
    setClassForm((current) => {
      const on = current.categories.some((item) => item.toLowerCase() === label.toLowerCase());
      const categories = on
        ? current.categories.filter((item) => item.toLowerCase() !== label.toLowerCase())
        : [...current.categories, label];
      return { ...current, categories: categories.length ? categories : [label] };
    });
  }

  return (
    <FechasView
      isAdmin={api.isAdmin}
      classes={classes}
      events={api.state.events}
      classForm={classForm}
      classFormOpen={classFormOpen}
      onClassForm={(patch) => setClassForm((current) => ({ ...current, ...patch }))}
      onSaveClass={(event) => {
        event.preventDefault();
        const saved = api.saveBoatClass({
          name: classForm.name,
          original: classForm.original,
          categories: classForm.categories
        });
        if (saved) {
          setClassForm(emptyClass());
          setClassFormOpen(false);
        }
      }}
      onBeginNewClass={() => {
        setClassForm(emptyClass());
        setClassFormOpen(true);
      }}
      onCancelClassEdit={() => {
        setClassForm(emptyClass());
        setClassFormOpen(false);
      }}
      onToggleCategory={toggleCategory}
      onAddCategory={(label) => {
        setClassForm((current) => {
          if (current.categories.some((item) => item.toLowerCase() === label.toLowerCase())) return current;
          return { ...current, categories: [...current.categories, label] };
        });
      }}
      onEditClass={(name) => {
        const found = classes.find((item) => item.name === name);
        if (!found) return;
        setClassForm({ original: found.name, name: found.name, categories: found.categories.slice() });
        setClassFormOpen(true);
      }}
      onDeleteClass={async (name) => {
        if (classes.length <= 1) {
          api.showToast("Debe quedar al menos una clase");
          return;
        }
        const used = api.state.sailors.filter((sailor) => sailor.boatClass === name).length;
        const ok = await confirm({
          title: `Borrar ${name}`,
          message: used
            ? `Hay ${used} inscripto(s) en ${name}. Si borrás la clase, pasan a la primera clase restante.`
            : `¿Borrar la clase ${name}?`,
          confirmLabel: "Borrar",
          danger: true
        });
        if (ok && !api.deleteBoatClass(name)) return;
      }}
      fechaForm={fechaForm}
      fechaFormRef={fechaFormRef}
      creatingFecha={creatingFecha}
      editingFechaId={fechaForm.id}
      fileEpoch={fileEpoch}
      maxDiscards={maxDiscards}
      arHint={docHint(editingEvent?.ar?.name)}
      irHint={docHint(editingEvent?.ir?.name)}
      onFechaForm={(patch) => setFechaForm((current) => ({ ...current, ...patch }))}
      onSaveFecha={onSaveFecha}
      onCancelFechaEditor={closeFechaEditor}
      onBeginNewFecha={() => {
        setCreatingFecha(true);
        setFechaForm({ ...emptyFecha(), name: suggestNextFechaName(api.state.events) });
        setFileEpoch((current) => current + 1);
      }}
      onEditFecha={(id) => {
        const event = api.state.events.find((item) => item.id === id);
        if (!event) return;
        setCreatingFecha(false);
        setFechaForm({
          id: event.id,
          name: event.name,
          date: event.date,
          time: event.time,
          avisos: event.avisos || "",
          racesCount: event.racesCount || 3,
          discardsAllowed: event.discardsAllowed ?? (event.racesCount >= 3 ? 1 : 0)
        });
        setFileEpoch((current) => current + 1);
      }}
      onDeleteFecha={async (id) => {
        if (api.state.events.length <= 1) {
          api.showToast("Dejá al menos una fecha");
          return;
        }
        const event = api.state.events.find((item) => item.id === id);
        const label = event?.name || "esta fecha";
        const ok = await confirm({
          title: `Eliminar ${label}`,
          message: `Se borran ${label} y sus resultados. No se puede deshacer.`,
          confirmLabel: "Eliminar",
          danger: true
        });
        if (!ok) return;
        api.deleteFecha(id);
        if (fechaForm.id === id) closeFechaEditor();
      }}
      onDownload={(id, kind) => {
        const event = api.state.events.find((item) => item.id === id);
        const doc = event?.[kind];
        if (!downloadDoc(doc, kind === "ar" ? "AR.pdf" : "IR.pdf")) api.showToast("No hay archivo cargado");
      }}
    />
  );
}
