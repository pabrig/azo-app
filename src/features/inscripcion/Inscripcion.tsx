import { useEffect, useState, type FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import { downloadDoc } from "../../data/download-doc";
import {
  categoriesForClass,
  classNames,
  currentEvent,
  fechaLabel,
  preferredClassName,
  sailorFechas,
  sailorsInFecha
} from "../../domain/model";
import { InscripcionView, type InscripcionDraft } from "./Inscripcion.view";

export function Inscripcion() {
  const api = useChampionship();
  const event = currentEvent(api.state);
  const classes = classNames(api.state);
  const [draft, setDraft] = useState<InscripcionDraft>(() => ({
    sailNumber: "",
    boatClass: preferredClassName(api.state),
    name: "",
    category: "General",
    club: "",
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

  function onSubmit(eventForm: FormEvent) {
    eventForm.preventDefault();
    api.registerSailor({
      sailNumber: draft.sailNumber,
      boatClass: draft.boatClass,
      name: draft.name,
      category: draft.category,
      club: draft.club,
      fecha: draft.fecha
    });
    setDraft((current) => ({ ...current, sailNumber: "", name: "", club: "" }));
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
        label: fechaLabel(api.state.events, item.id)
      }))}
      brief={event}
      sailors={sailors}
      onChange={(patch) => {
        if (patch.fecha) api.setFecha(patch.fecha);
        setDraft((current) => ({ ...current, ...patch }));
      }}
      onSubmit={onSubmit}
      onDownload={(kind) => {
        const doc = event?.[kind];
        if (!downloadDoc(doc, kind === "ar" ? "AR.pdf" : "IR.pdf")) {
          api.showToast("No hay archivo cargado");
        }
      }}
      onDelete={(id) => {
        if (!api.isAdmin) {
          api.deleteSailor(id);
          return;
        }
        if (!window.confirm("¿Eliminar este inscripto?")) return;
        api.deleteSailor(id);
      }}
    />
  );
}
