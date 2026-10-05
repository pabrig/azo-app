import type { FormEvent, RefObject } from "react";
import type { BoatClass, Fecha } from "../../domain/types";
import { Card, Field, controlClass } from "../../ui/primitives";

export type FechaFormState = {
  id: string;
  name: string;
  date: string;
  time: string;
  avisos: string;
};

export type ClassFormState = {
  original: string;
  name: string;
  categories: string;
};

export function FechasView({
  isAdmin,
  classes,
  events,
  whatsappUrl,
  whatsappRef,
  onWhatsappUrl,
  onSaveWhatsapp,
  classForm,
  classFormRef,
  onClassForm,
  onSaveClass,
  onEditClass,
  onDeleteClass,
  fechaForm,
  fechaFormRef,
  fechaIsEdit,
  fileEpoch,
  arHint,
  irHint,
  onFechaForm,
  onSaveFecha,
  onResetFecha,
  onBeginNewFecha,
  onEditFecha,
  onDeleteFecha,
  onDownload,
  editingFechaId,
  configOpen,
  onConfigOpenChange,
  onCancelClassEdit
}: {
  isAdmin: boolean;
  classes: BoatClass[];
  events: Fecha[];
  whatsappUrl: string;
  whatsappRef: RefObject<HTMLInputElement | null>;
  onWhatsappUrl: (value: string) => void;
  onSaveWhatsapp: (event: FormEvent) => void;
  classForm: ClassFormState;
  classFormRef: RefObject<HTMLFormElement | null>;
  onClassForm: (patch: Partial<ClassFormState>) => void;
  onSaveClass: (event: FormEvent) => void;
  onEditClass: (name: string) => void;
  onDeleteClass: (name: string) => void;
  fechaForm: FechaFormState;
  fechaFormRef: RefObject<HTMLFormElement | null>;
  fechaIsEdit: boolean;
  fileEpoch: number;
  arHint: string;
  irHint: string;
  onFechaForm: (patch: Partial<FechaFormState>) => void;
  onSaveFecha: (event: FormEvent<HTMLFormElement>) => void;
  onResetFecha: () => void;
  onBeginNewFecha: () => void;
  onEditFecha: (id: string) => void;
  onDeleteFecha: (id: string) => void;
  onDownload: (id: string, kind: "ar" | "ir") => void;
  editingFechaId: string;
  configOpen: boolean;
  onConfigOpenChange: (open: boolean) => void;
  onCancelClassEdit: () => void;
}) {
  const classIsEdit = Boolean(classForm.original);
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-bold tracking-tight">Fechas del campeonato</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Día, hora, avisos y documentos AR/IR. Las clases y categorías se editan abajo (no dependen de una fecha).
        </p>
      </header>

      {classes.length ? (
        <div className="flex flex-wrap gap-1.5">
          {classes.map((item) => (
            <span key={item.name} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-slate-200">
              {item.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Sin clases definidas todavía.</p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">
          Calendario {events.length ? `(${events.length})` : ""}
        </h2>
        {isAdmin && fechaIsEdit ? (
          <p className="text-[11px] text-cyan-300/90">La fecha marcada en cyan es la que estás modificando abajo.</p>
        ) : null}
        {events.length ? (
          events.map((event) => {
            const isEditing = isAdmin && event.id === editingFechaId;
            return (
              <article
                key={event.id}
                className={`rounded-2xl p-4 space-y-2.5 transition-colors ${
                  isEditing
                    ? "bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(45,181,224,0.25)]"
                    : "bg-sea-800/80 border border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {isEditing ? (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-sea-900 bg-cyan-400 px-2 py-0.5 rounded-md mb-1.5">
                        En edición
                      </span>
                    ) : null}
                    <h3 className="font-bold">{event.name}</h3>
                    <p className="text-sm text-cyan-400">
                      {event.date ? formatDay(event.date) : "Sin día"} · {event.time || "—"} hs
                    </p>
                  </div>
                  {isAdmin ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditFecha(event.id)}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          isEditing ? "bg-cyan-500 text-sea-900 font-bold" : "bg-white/10"
                        }`}
                      >
                        {isEditing ? "Editando" : "Editar"}
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
              </article>
            );
          })
        ) : (
          <Card className="text-sm text-slate-400">Todavía no hay fechas publicadas.</Card>
        )}
      </section>

      {isAdmin ? (
        <Card
          className={`space-y-3 ${
            fechaIsEdit
              ? "border-2 border-cyan-400/60 bg-cyan-500/5"
              : "border border-white/10 border-dashed bg-sea-800/40"
          }`}
        >
          {fechaIsEdit ? (
            <div className="rounded-xl border border-cyan-400/35 bg-sea-900/50 px-3 py-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Actualizando</p>
              <p className="text-lg font-bold leading-tight">{fechaForm.name.trim() || "Sin nombre"}</p>
              <p className="text-sm text-slate-300">
                {fechaForm.date ? formatDay(fechaForm.date) : "Elegí el día"} · {fechaForm.time || "—"} hs
              </p>
              <button
                type="button"
                onClick={onBeginNewFecha}
                className="mt-2 text-[11px] font-semibold text-slate-400 underline underline-offset-2"
              >
                Cancelar y crear otra fecha
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Nueva fecha</p>
              <p className="text-sm text-slate-400 mt-1">Completá el formulario o tocá Editar en una fecha del calendario.</p>
            </div>
          )}
          <form ref={fechaFormRef} className="space-y-2.5" onSubmit={onSaveFecha}>
            <Field label="Nombre *">
              <input
                required
                placeholder="Fecha 2"
                value={fechaForm.name}
                onChange={(event) => onFechaForm({ name: event.target.value })}
                className={controlClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Día *">
                <input
                  type="date"
                  required
                  value={fechaForm.date}
                  onChange={(event) => onFechaForm({ date: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field label="Hora largada *">
                <input
                  type="time"
                  required
                  value={fechaForm.time}
                  onChange={(event) => onFechaForm({ time: event.target.value })}
                  className={controlClass}
                />
              </Field>
            </div>
            <Field label="Avisos (TOA)">
              <textarea
                rows={3}
                placeholder="Cambios de IR, horario, grupo WhatsApp…"
                value={fechaForm.avisos}
                onChange={(event) => onFechaForm({ avisos: event.target.value })}
                className={controlClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="AR (Aviso de Regata)">
                <input
                  key={`ar-${fileEpoch}`}
                  name="ar"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-sea-900 file:font-bold file:px-2 file:py-1"
                />
                <span className="mt-1 block text-[10px] text-slate-500">{arHint}</span>
              </Field>
              <Field label="IR (Instrucciones)">
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
            <div className="flex gap-2 pt-1">
              <button className="flex-1 bg-cyan-500 text-sea-900 font-bold py-3 rounded-xl text-sm">
                {fechaIsEdit ? "Guardar cambios" : "Crear fecha"}
              </button>
              <button type="button" onClick={fechaIsEdit ? onBeginNewFecha : onResetFecha} className="px-4 bg-white/10 rounded-xl text-sm">
                {fechaIsEdit ? "Salir" : "Limpiar"}
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="text-sm text-slate-400">
          Para crear o cambiar fechas, clases y canal WhatsApp, ingresá el PIN de comisión (pestaña Carga).
        </Card>
      )}

      {isAdmin ? (
        <details
          open={configOpen}
          onToggle={(event) => onConfigOpenChange(event.currentTarget.open)}
          className="group rounded-2xl border border-white/10 bg-sea-800/40 open:bg-sea-800/60"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
            Clases, categorías y WhatsApp
            <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
              Podés cambiarlas en cualquier momento, aunque las fechas ya estén creadas
            </span>
          </summary>
          <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Canal WhatsApp</h3>
              <p className="text-xs text-slate-400">Si el grupo cambia, actualizá el link. Todos ven el acceso al instante.</p>
              <form className="space-y-2.5" onSubmit={onSaveWhatsapp}>
                <Field label="Link del grupo (chat.whatsapp.com)">
                  <input
                    ref={whatsappRef}
                    type="url"
                    required
                    placeholder="https://chat.whatsapp.com/…"
                    value={whatsappUrl}
                    onChange={(event) => onWhatsappUrl(event.target.value)}
                    className={controlClass}
                  />
                </Field>
                <button className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm">Guardar canal</button>
              </form>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Clases</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los timoneles eligen clase y categoría al inscribirse. Por defecto: Masculino, Femenino y General; podés
                agregar o quitar separando con coma (ej. Master, Junior).
              </p>
              {classIsEdit ? (
                <p className="text-[11px] text-cyan-400 font-semibold">Editando clase: {classForm.original}</p>
              ) : null}
              <form ref={classFormRef} className="space-y-2" onSubmit={onSaveClass}>
                <Field label="Nombre de la clase *">
                  <input
                    required
                    placeholder="ILCA 6"
                    value={classForm.name}
                    onChange={(event) => onClassForm({ name: event.target.value })}
                    className={controlClass}
                  />
                </Field>
                <Field label="Categorías de la clase">
                  <input
                    placeholder="Masculino, Femenino, General"
                    value={classForm.categories}
                    onChange={(event) => onClassForm({ categories: event.target.value })}
                    className={controlClass}
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    Editá la lista antes de guardar. Al crear una clase nueva ya vienen las tres por defecto.
                  </span>
                </Field>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-cyan-500 text-sea-900 font-bold py-2.5 rounded-xl text-sm">
                    {classIsEdit ? "Guardar cambios" : "Agregar clase"}
                  </button>
                  {classIsEdit ? (
                    <button
                      type="button"
                      onClick={onCancelClassEdit}
                      className="px-3 bg-white/10 rounded-xl text-sm"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="divide-y divide-white/5">
                {classes.map((item) => (
                  <div key={item.name} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.categories.join(", ")}</p>
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
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
