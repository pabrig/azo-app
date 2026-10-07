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
import { useConfirm } from "../../ui/confirm";

export function Inscripcion() {
  const api = useChampionship();
  const confirm = useConfirm();
  const event = currentEvent(api.state);
  const classes = classNames(api.state);
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
  );
}
