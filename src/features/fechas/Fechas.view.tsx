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
  fileEpoch,
  arHint,
  irHint,
  onFechaForm,
  onSaveFecha,
  onResetFecha,
  onEditFecha,
  onDeleteFecha,
  onDownload
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
  fileEpoch: number;
  arHint: string;
  irHint: string;
  onFechaForm: (patch: Partial<FechaFormState>) => void;
  onSaveFecha: (event: FormEvent<HTMLFormElement>) => void;
  onResetFecha: () => void;
  onEditFecha: (id: string) => void;
  onDeleteFecha: (id: string) => void;
  onDownload: (id: string, kind: "ar" | "ir") => void;
}) {
  return (
    <div className="space-y-3">
      {isAdmin ? (
        <Card className="space-y-3 border-emerald-500/25">
          <h2 className="font-bold">Canal oficial WhatsApp</h2>
          <p className="text-xs text-slate-400">
            Si el grupo cambia, actualizá el link. Todos los competidores verán el nuevo acceso al instante.
          </p>
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
            <button className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl">Guardar canal oficial</button>
          </form>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card className="space-y-3">
          <h2 className="font-bold">Clases del campeonato</h2>
          <p className="text-xs text-slate-400">Los timoneles ven estas clases al inscribirse. Categorías separadas por coma.</p>
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
            <Field label="Categorías">
              <input
                placeholder="General, Junior, Master"
                value={classForm.categories}
                onChange={(event) => onClassForm({ categories: event.target.value })}
                className={controlClass}
              />
            </Field>
            <button className="w-full bg-cyan-500 text-sea-900 font-bold py-2.5 rounded-xl">Guardar clase</button>
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
        </Card>
      ) : null}

      <Card>
        <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">Clases a competir</p>
        <div className="flex flex-wrap gap-1.5">
          {classes.length ? (
            classes.map((item) => (
              <span key={item.name} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-slate-200">
                {item.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">Sin clases definidas.</span>
          )}
        </div>
      </Card>

      {events.length ? (
        events.map((event) => (
          <article key={event.id} className="bg-sea-800 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{event.name}</h3>
                <p className="text-sm text-cyan-400">
                  {event.date ? formatDay(event.date) : "Sin día"} · {event.time || "—"} hs
                </p>
              </div>
              {isAdmin ? (
                <div className="flex gap-1">
                  <button type="button" onClick={() => onEditFecha(event.id)} className="text-xs bg-white/10 px-2 py-1 rounded-lg">
                    Editar
                  </button>
                  <button type="button" onClick={() => onDeleteFecha(event.id)} className="text-xs text-red-300 px-2 py-1">
                    Borrar
                  </button>
                </div>
              ) : null}
            </div>
            {isAdmin ? (
              <p className="text-[11px] text-slate-500">
                Archivo actual · AR: {event.ar?.name || "—"} · IR: {event.ir?.name || "—"}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => onDownload(event.id, "ar")} className="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold">
                Descargar AR
              </button>
              <button type="button" onClick={() => onDownload(event.id, "ir")} className="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold">
                Descargar IR
              </button>
            </div>
          </article>
        ))
      ) : (
        <Card className="text-sm text-slate-400">No hay fechas. La comisión puede crearlas con el PIN.</Card>
      )}

      {isAdmin ? (
        <Card className="space-y-3">
          <h2 className="font-bold">Nueva fecha / editar</h2>
          <p className="text-xs text-slate-400">PIN de comisión requerido. Podés reemplazar AR e IR si cambian.</p>
          <form ref={fechaFormRef} className="space-y-2.5" onSubmit={onSaveFecha}>
            <Field label="Nombre *">
              <input
                required
                placeholder="Fecha 1"
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
                rows={4}
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
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-sea-900 file:font-bold file:px-2 file:py-1"
                />
                <span className="mt-1 block text-[10px] text-slate-500">{arHint}</span>
              </Field>
              <Field label="IR (Instrucciones)">
                <input
                  key={`ir-${fileEpoch}`}
                  name="ir"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-sea-900 file:font-bold file:px-2 file:py-1"
                />
                <span className="mt-1 block text-[10px] text-slate-500">{irHint}</span>
              </Field>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-cyan-500 text-sea-900 font-bold py-2.5 rounded-xl">Guardar fecha</button>
              <button type="button" onClick={onResetFecha} className="px-4 bg-white/10 rounded-xl text-sm">
                Limpiar
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="space-y-2">
          <p className="text-sm text-slate-400">
            Para crear o cambiar fechas, clases, canal WhatsApp y AR/IR, ingresá el PIN (pestaña Carga).
          </p>
        </Card>
      )}
    </div>
  );
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
