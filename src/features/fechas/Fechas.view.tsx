import type { FormEvent, RefObject } from "react";
import { DEFAULT_CLASS_CATEGORIES } from "../../domain/defaults";
import { MAX_RACES } from "../../domain/race-slots";
import { formatRaceDiscardSummary } from "../../domain/scoring";
import type { BoatClass, Fecha } from "../../domain/types";
import { Card, Field, controlClass } from "../../ui/primitives";

export type FechaFormState = {
  id: string;
  name: string;
  date: string;
  time: string;
  avisos: string;
  racesCount: number;
  discardsAllowed: number;
};

export type ClassFormState = {
  original: string;
  name: string;
  categories: string[];
};

export function FechasView({
  isAdmin,
  classes,
  events,
  classForm,
  classFormOpen,
  onClassForm,
  onSaveClass,
  onEditClass,
  onDeleteClass,
  onBeginNewClass,
  onCancelClassEdit,
  onToggleCategory,
  onAddCategory,
  fechaForm,
  fechaFormRef,
  creatingFecha,
  fileEpoch,
  arHint,
  irHint,
  maxDiscards,
  onFechaForm,
  onSaveFecha,
  onBeginNewFecha,
  onCancelFechaEditor,
  onEditFecha,
  onDeleteFecha,
  onDownload,
  editingFechaId
}: {
  isAdmin: boolean;
  classes: BoatClass[];
  events: Fecha[];
  classForm: ClassFormState;
  classFormOpen: boolean;
  onClassForm: (patch: Partial<ClassFormState>) => void;
  onSaveClass: (event: FormEvent) => void;
  onEditClass: (name: string) => void;
  onDeleteClass: (name: string) => void | Promise<void>;
  onBeginNewClass: () => void;
  onCancelClassEdit: () => void;
  onToggleCategory: (label: string) => void;
  onAddCategory: (label: string) => void;
  fechaForm: FechaFormState;
  fechaFormRef: RefObject<HTMLFormElement | null>;
  creatingFecha: boolean;
  fileEpoch: number;
  arHint: string;
  irHint: string;
  maxDiscards: number;
  onFechaForm: (patch: Partial<FechaFormState>) => void;
  onSaveFecha: (event: FormEvent<HTMLFormElement>) => void;
  onBeginNewFecha: () => void;
  onCancelFechaEditor: () => void;
  onEditFecha: (id: string) => void;
  onDeleteFecha: (id: string) => void | Promise<void>;
  onDownload: (id: string, kind: "ar" | "ir") => void;
  editingFechaId: string;
}) {
  const classIsEdit = Boolean(classForm.original);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Fechas del campeonato</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Día, hora, regatas, descartes y AR/IR. Placa y ranking solo publican una fecha cuando hay resultados cargados.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={onBeginNewFecha}
            className="shrink-0 bg-cyan-500 text-sea-900 font-bold text-xs px-3 py-2 rounded-xl"
          >
            Nueva fecha
          </button>
        ) : null}
      </header>

      <section className="space-y-2">
        {isAdmin && creatingFecha ? (
          <article className="rounded-2xl p-4 space-y-3 border-2 border-cyan-400 bg-cyan-500/10">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Nueva fecha</p>
            <form ref={fechaFormRef} className="space-y-2.5" onSubmit={onSaveFecha}>
              <FechaFields
                form={fechaForm}
                fileEpoch={fileEpoch}
                arHint={arHint}
                irHint={irHint}
                maxDiscards={maxDiscards}
                onChange={onFechaForm}
              />
              <div className="flex gap-2 pt-1">
                <button className="flex-1 bg-cyan-500 text-sea-900 font-bold py-3 rounded-xl text-sm">
                  Crear fecha
                </button>
                <button type="button" onClick={onCancelFechaEditor} className="px-4 bg-white/10 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </article>
        ) : null}

        {events.length ? (
          events.map((event) => {
            const isEditing = isAdmin && !creatingFecha && event.id === editingFechaId;
            const summary = formatRaceDiscardSummary(event);
            return (
              <article
                key={event.id}
                className={`rounded-2xl p-4 space-y-2.5 transition-colors ${
                  isEditing
                    ? "bg-cyan-500/10 border-2 border-cyan-400"
                    : "bg-sea-800/80 border border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold">{event.name}</h3>
                    <p className="text-sm text-cyan-400">
                      {event.date ? formatDay(event.date) : "Sin día"} · {event.time || "—"} hs
                    </p>
                    <p className={`text-[10px] mt-0.5 ${summary.raced ? "text-cyan-300/80" : "text-slate-400"}`}>
                      {summary.line}
                    </p>
                  </div>
                  {isAdmin ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => (isEditing ? onCancelFechaEditor() : onEditFecha(event.id))}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          isEditing ? "bg-cyan-500 text-sea-900 font-bold" : "bg-white/10"
                        }`}
                      >
                        {isEditing ? "Cerrar" : "Editar"}
                      </button>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => onDeleteFecha(event.id)}
                          className="text-xs text-red-300 px-2 py-1"
                        >
                          Borrar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <form ref={fechaFormRef} className="space-y-2.5 pt-1 border-t border-white/10" onSubmit={onSaveFecha}>
                    <FechaFields
                      form={fechaForm}
                      fileEpoch={fileEpoch}
                      arHint={arHint}
                      irHint={irHint}
                      maxDiscards={maxDiscards}
                      onChange={onFechaForm}
                    />
                    <button className="w-full bg-cyan-500 text-sea-900 font-bold py-3 rounded-xl text-sm">
                      Guardar cambios
                    </button>
                  </form>
                ) : (
                  <>
                    {isAdmin ? (
                      <p className="text-[11px] text-slate-500">
                        PDF · AR: {event.ar?.name || "—"} · IR: {event.ir?.name || "—"}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onDownload(event.id, "ar")}
                        className="flex-1 bg-white/10 rounded-xl py-2.5 text-xs font-bold"
                      >
                        AR
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(event.id, "ir")}
                        className="flex-1 bg-white/10 rounded-xl py-2.5 text-xs font-bold"
                      >
                        IR
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })
        ) : (
          <Card className="text-sm text-slate-400">Todavía no hay fechas publicadas.</Card>
        )}
      </section>

      {isAdmin ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Clases</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Tocá una clase para editarla. Las categorías se eligen con chips.</p>
            </div>
            <button
              type="button"
              onClick={onBeginNewClass}
              className="shrink-0 bg-white/10 text-xs font-bold px-3 py-1.5 rounded-xl"
            >
              Agregar
            </button>
          </div>

          {classFormOpen ? (
            <form className="space-y-2.5 rounded-xl border border-cyan-400/40 bg-sea-900/40 p-3" onSubmit={onSaveClass}>
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
                {classIsEdit ? `Editando ${classForm.original}` : "Nueva clase"}
              </p>
              <Field label="Nombre *">
                <input
                  required
                  placeholder="ILCA 6"
                  value={classForm.name}
                  onChange={(event) => onClassForm({ name: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-semibold">Categorías</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {categoryChoices(classForm.categories).map((label) => {
                    const on = classForm.categories.some((item) => item.toLowerCase() === label.toLowerCase());
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleCategory(label)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          on ? "bg-cyan-500 text-sea-900" : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <AddCategoryField onAdd={onAddCategory} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-cyan-500 text-sea-900 font-bold py-2.5 rounded-xl text-sm">
                  {classIsEdit ? "Guardar" : "Agregar clase"}
                </button>
                <button type="button" onClick={onCancelClassEdit} className="px-3 bg-white/10 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          <div className="divide-y divide-white/5">
            {classes.map((item) => (
              <div key={item.name} className="py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.categories.map((category) => (
                      <span key={category} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => onEditClass(item.name)} className="text-xs bg-white/10 px-2 py-1 rounded-lg">
                    Editar
                  </button>
                  <button type="button" onClick={() => onDeleteClass(item.name)} className="text-xs text-red-300 px-2 py-1">
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="text-sm text-slate-400">
          Para crear o cambiar fechas y clases, ingresá el PIN de comisión (pestaña Carga).
        </Card>
      )}
    </div>
  );
}

function FechaFields({
  form,
  fileEpoch,
  arHint,
  irHint,
  maxDiscards,
  onChange
}: {
  form: FechaFormState;
  fileEpoch: number;
  arHint: string;
  irHint: string;
  maxDiscards: number;
  onChange: (patch: Partial<FechaFormState>) => void;
}) {
  return (
    <>
      <Field label="Nombre *">
        <input
          required
          placeholder="Fecha 2"
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className={controlClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Día *">
          <input
            type="date"
            required
            value={form.date}
            onChange={(event) => onChange({ date: event.target.value })}
            className={controlClass}
          />
        </Field>
        <Field label="Hora largada *">
          <input
            type="time"
            required
            value={form.time}
            onChange={(event) => onChange({ time: event.target.value })}
            className={controlClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Regatas">
          <select
            value={String(form.racesCount)}
            onChange={(event) => {
              const racesCount = Number(event.target.value);
              onChange({
                racesCount,
                discardsAllowed: Math.min(form.discardsAllowed, Math.max(0, racesCount - 1))
              });
            }}
            className={controlClass}
          >
            {Array.from({ length: MAX_RACES }, (_, index) => {
              const count = index + 1;
              return (
                <option key={count} value={count}>
                  {count === 1 ? "1 regata" : `${count} regatas`}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Descartes">
          <select
            value={String(form.discardsAllowed)}
            onChange={(event) => onChange({ discardsAllowed: Number(event.target.value) })}
            className={controlClass}
          >
            {Array.from({ length: maxDiscards + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count === 0 ? "Sin descarte" : `${count} descarte${count === 1 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed -mt-1">
        Misma regla para las dos: se guardan en esta fecha. Placa y ranking usan solo las regatas con resultado. Con 3 o
        más, el campeonato usa 1 descarte salvo que elijas otro.
      </p>
      <Field label="Avisos (TOA)">
        <textarea
          rows={2}
          placeholder="Cambios de IR, horario…"
          value={form.avisos}
          onChange={(event) => onChange({ avisos: event.target.value })}
          className={controlClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="AR (PDF)">
          <input
            key={`ar-${fileEpoch}`}
            name="ar"
            type="file"
            accept=".pdf,application/pdf"
            className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-sea-900 file:font-bold file:px-2 file:py-1"
          />
          <span className="mt-1 block text-[10px] text-slate-500">{arHint}</span>
        </Field>
        <Field label="IR (PDF)">
          <input
            key={`ir-${fileEpoch}`}
            name="ir"
            type="file"
            accept=".pdf,application/pdf"
            className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-sea-900 file:font-bold file:px-2 file:py-1"
          />
          <span className="mt-1 block text-[10px] text-slate-500">{irHint}</span>
        </Field>
      </div>
    </>
  );
}

function categoryChoices(selected: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of [...DEFAULT_CLASS_CATEGORIES, ...selected]) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function AddCategoryField({ onAdd }: { onAdd: (label: string) => void }) {
  return (
    <input
      placeholder="Otra (Enter)"
      className={`${controlClass} mt-1.5`}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const value = event.currentTarget.value.trim();
        if (!value) return;
        onAdd(value);
        event.currentTarget.value = "";
      }}
    />
  );
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
