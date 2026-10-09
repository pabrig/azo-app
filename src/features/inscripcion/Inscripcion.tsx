import { useEffect, useState, type FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import {
  categoriesForClass,
  classNames,
  currentEvent,
  fechaLabel,
  isFechaRegistrationClosed,
  preferredClassName,
  sailorFechas,
  sailorsInFecha
} from "../../domain/model";
import { InscripcionView, type InscripcionDraft } from "./Inscripcion.view";
import { AppModal } from "../../ui/AppModal";
import { Field, controlClass } from "../../ui/primitives";
import { useConfirm } from "../../ui/confirm";
import type { Sailor } from "../../domain/types";

export function Inscripcion() {
  const api = useChampionship();
  const confirm = useConfirm();
  const event = currentEvent(api.state);
  const classes = classNames(api.state);
  const [editing, setEditing] = useState<Sailor | null>(null);
  const [draft, setDraft] = useState<InscripcionDraft>(() => ({
    sailNumber: "",
    boatClass: preferredClassName(api.state),
    name: "",
    category: "General",
    club: "",
    celular: "",
    dni: "",
    fecha: api.state.fecha
  }));

  const categories = categoriesForClass(api.state, draft.boatClass);
  const editCategories = categoriesForClass(api.state, editing?.boatClass || draft.boatClass);

  useEffect(() => {
    if (!classes.includes(draft.boatClass)) {
      setDraft((current) => ({ ...current, boatClass: preferredClassName(api.state) }));
    }
  }, [api.state, classes, draft.boatClass]);

  useEffect(() => {
    if (!categories.includes(draft.category)) {
      setDraft((current) => ({ ...current, category: categories[0] || "General" }));
    }
  }, [categories, draft.category]);

  useEffect(() => {
    if (api.state.fecha && api.state.fecha !== draft.fecha) {
      setDraft((current) => ({ ...current, fecha: api.state.fecha }));
    }
  }, [api.state.fecha, draft.fecha]);

  const registrationEvent =
    api.state.events.find((item) => item.id === draft.fecha) ?? event ?? null;
  const canRegister =
    api.isAdmin || !registrationEvent || !isFechaRegistrationClosed(registrationEvent);

  function onSubmit(eventForm: FormEvent) {
    eventForm.preventDefault();
    if (!canRegister) return;
    api.registerSailor({
      sailNumber: draft.sailNumber,
      boatClass: draft.boatClass,
      name: draft.name,
      category: draft.category,
      club: draft.club,
      celular: draft.celular,
      dni: draft.dni,
      fecha: draft.fecha
    });
    setDraft((current) => ({ ...current, sailNumber: "", name: "", club: "", celular: "", dni: "" }));
  }

  const sailors = event
    ? sailorsInFecha(api.state, event.id).map((sailor) => ({
        sailor,
        fechas: sailorFechas(sailor, api.state.events)
          .map((id) => fechaLabel(api.state.events, id))
          .join(" · ")
      }))
    : [];

  return (
    <>
    <InscripcionView
      draft={draft}
      classes={classes}
      categories={categories}
      fechas={api.state.events.map((item) => ({
        id: item.id,
        label: fechaLabel(api.state.events, item.id),
        registrationClosed: !api.isAdmin && isFechaRegistrationClosed(item)
      }))}
      brief={event}
      canRegister={canRegister}
      sailors={sailors}
      isAdmin={api.isAdmin}
      onChange={(patch) => {
        if (patch.fecha) api.setFecha(patch.fecha);
        setDraft((current) => ({ ...current, ...patch }));
      }}
      onSubmit={onSubmit}
      onEdit={(id) => {
        const sailor = api.state.sailors.find((item) => item.id === id);
        if (sailor) setEditing({ ...sailor });
      }}
      onDelete={async (id) => {
        if (!api.isAdmin) {
          api.deleteSailor(id);
          return;
        }
        const ok = await confirm({
          title: "Eliminar inscripto",
          message: "Se quita a esta persona de la lista. Podés volver a inscribirla después.",
          confirmLabel: "Eliminar",
          danger: true
        });
        if (!ok) return;
        api.deleteSailor(id);
      }}
    />
    <AppModal
      open={Boolean(editing)}
      size="wide"
      title={editing?.name || "Inscripto"}
      kicker="Editar"
      onClose={() => setEditing(null)}
      footer={
        <>
          <button type="button" className="app-modal-btn app-modal-btn--ghost" onClick={() => setEditing(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="app-modal-btn app-modal-btn--primary"
            onClick={() => {
              if (!editing) return;
              const category = editCategories.includes(editing.category)
                ? editing.category
                : editCategories[0] || "General";
              if (
                api.updateSailor({
                  id: editing.id,
                  sailNumber: editing.sailNumber,
                  boatClass: editing.boatClass,
                  name: editing.name,
                  category,
                  club: editing.club,
                  celular: editing.celular,
                  dni: editing.dni
                })
              ) {
                setEditing(null);
              }
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      {editing ? (
        <div className="space-y-2.5">
          <Field label="Nº vela *">
            <input
              value={editing.sailNumber}
              onChange={(event) => setEditing({ ...editing, sailNumber: event.target.value })}
              className={controlClass}
            />
          </Field>
          <Field label="Nombre *">
            <input
              value={editing.name}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              className={controlClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Clase">
              <select
                value={editing.boatClass}
                onChange={(event) => setEditing({ ...editing, boatClass: event.target.value })}
                className={controlClass}
              >
                {classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría">
              <select
                value={editCategories.includes(editing.category) ? editing.category : editCategories[0] || ""}
                onChange={(event) => setEditing({ ...editing, category: event.target.value })}
                className={controlClass}
              >
                {editCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Club">
            <input
              value={editing.club}
              onChange={(event) => setEditing({ ...editing, club: event.target.value })}
              className={controlClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Celular">
              <input
                type="tel"
                value={editing.celular || ""}
                onChange={(event) => setEditing({ ...editing, celular: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field label="DNI">
              <input
                inputMode="numeric"
                value={editing.dni || ""}
                onChange={(event) => setEditing({ ...editing, dni: event.target.value })}
                className={controlClass}
              />
            </Field>
          </div>
        </div>
      ) : null}
    </AppModal>
    </>
  );
}
