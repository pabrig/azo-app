import { useEffect, useRef, type FormEvent } from "react";
import type { Fecha, Sailor } from "../../domain/types";
import { Card, Field, controlClass } from "../../ui/primitives";

export type InscripcionDraft = {
  sailNumber: string;
  boatClass: string;
  name: string;
  category: string;
  club: string;
  fecha: string;
};

export function InscripcionView({
  draft,
  classes,
  categories,
  fechas,
  brief,
  canRegister,
  isAdmin,
  sailors,
  onChange,
  onSubmit,
  onDownload,
  onDelete
}: {
  draft: InscripcionDraft;
  classes: string[];
  categories: string[];
  fechas: { id: string; label: string; registrationClosed?: boolean }[];
  brief: Fecha | null;
  canRegister: boolean;
  isAdmin: boolean;
  sailors: { sailor: Sailor; fechas: string }[];
  onChange: (patch: Partial<InscripcionDraft>) => void;
  onSubmit: (event: FormEvent) => void;
  onDownload: (kind: "ar" | "ir") => void;
  onDelete: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(sailors.length);

  useEffect(() => {
    if (sailors.length > previousCount.current && listRef.current) {
      const list = listRef.current;
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    }
    previousCount.current = sailors.length;
  }, [sailors.length]);

  return (
    <div className="inscripcion-layout space-y-3 lg:space-y-0 lg:gap-5">
      <Card className="space-y-2 text-sm lg:sticky lg:top-3 lg:self-start">
        {brief ? (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Próxima / seleccionada</p>
              <h3 className="font-bold">{brief.name}</h3>
              <p className="text-slate-300">
                {brief.date ? formatBriefDay(brief.date) : "Día a confirmar"} · {brief.time || ""} hs
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onDownload("ar")} className="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold">
                Descargar AR
              </button>
              <button type="button" onClick={() => onDownload("ir")} className="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold">
                Descargar IR
              </button>
            </div>
          </>
        ) : (
          <p className="text-slate-400 text-sm">Todavía no hay fechas del campeonato.</p>
        )}
      </Card>

      <div className="inscripcion-layout-main space-y-3 min-w-0">
      {canRegister ? (
      <form onSubmit={onSubmit} className="bg-sea-800 rounded-2xl p-4 lg:p-5 border border-white/10 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Inscripción</h2>
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Timonel</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nº vela *" className="col-span-2 sm:col-span-1">
            <input
              required
              autoComplete="off"
              placeholder="ARG 21054"
              value={draft.sailNumber}
              onChange={(event) => onChange({ sailNumber: event.target.value })}
              className={controlClass}
            />
          </Field>
          <Field label="Clase *" className="col-span-2 sm:col-span-1">
            <select
              value={draft.boatClass}
              onChange={(event) => onChange({ boatClass: event.target.value })}
              className={controlClass}
            >
              {classes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Nombre del timonel *">
          <input
            required
            autoComplete="name"
            placeholder="Nombre y apellido"
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className={controlClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Categoría">
            <select
              value={draft.category}
              onChange={(event) => onChange({ category: event.target.value })}
              className={controlClass}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Club">
            <input
              placeholder="CNA"
              value={draft.club}
              onChange={(event) => onChange({ club: event.target.value })}
              className={controlClass}
            />
          </Field>
        </div>
        <Field label="Fecha *">
          <select
            required
            value={draft.fecha}
            onChange={(event) => onChange({ fecha: event.target.value })}
            className={controlClass}
          >
            {fechas.map((fecha) => (
              <option key={fecha.id} value={fecha.id} disabled={fecha.registrationClosed}>
                {fecha.label}
                {fecha.registrationClosed ? " (cerrada)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={!fechas.length}
          className="w-full bg-cyan-500 text-sea-900 font-bold py-3 rounded-xl active:scale-[0.99] disabled:opacity-50"
        >
          Confirmar inscripción
        </button>
      </form>
      ) : (
        <Card className="border-amber-400/25 bg-amber-500/5 space-y-2">
          <h2 className="font-bold text-sm">Inscripción cerrada</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Esta fecha ya se disputó. Como timonel podés consultar quién está inscripto y descargar AR/IR; la comisión
            puede inscribir si hace falta.
          </p>
          {!isAdmin && brief?.date ? (
            <p className="text-[11px] text-slate-500">Regata: {formatBriefDay(brief.date)}</p>
          ) : null}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">{brief ? `Inscriptos · ${brief.name}` : "Inscriptos"}</h3>
          <span className="text-xs font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{sailors.length}</span>
        </div>
        <div ref={listRef} className="competitor-scroll divide-y divide-white/5">
          {!brief ? (
            <p className="py-6 text-center text-xs text-slate-500">Creá una fecha para empezar.</p>
          ) : sailors.length ? (
            sailors.map(({ sailor, fechas: fechaText }) => (
              <div key={sailor.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-cyan-400 bg-sea-900 border border-white/10 px-2 py-1 rounded-lg text-[11px]">
                    {sailor.sailNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{sailor.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {sailor.boatClass} · {sailor.category} · {sailor.club}
                    </p>
                    <p className="text-[10px] text-cyan-400/80">{fechaText}</p>
                  </div>
                </div>
                {isAdmin ? (
                  <button type="button" onClick={() => onDelete(sailor.id)} className="text-slate-500 text-xs px-2">
                    ✕
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">Nadie inscripto aún en {brief.name}.</p>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}

function formatBriefDay(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
