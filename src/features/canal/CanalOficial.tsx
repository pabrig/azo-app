import { useEffect, useState } from "react";
import { useChampionship } from "../../app/championship-context";
import { officialWhatsApp } from "../../domain/model";
import { CanalOficialView } from "./CanalOficial.view";

export function CanalOficial() {
  const api = useChampionship();
  const current = officialWhatsApp(api.state);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(current);

  useEffect(() => {
    if (!editing) setDraftUrl(current);
  }, [current, editing]);

  useEffect(() => {
    if (!api.whatsappFocus || !api.isAdmin) return;
    setDraftUrl(officialWhatsApp(api.state));
    setEditing(true);
  }, [api.whatsappFocus, api.isAdmin]);

  return (
    <CanalOficialView
      isAdmin={api.isAdmin}
      editing={editing}
      draftUrl={draftUrl}
      onOpen={() => {
        const url = officialWhatsApp(api.state);
        if (!url) {
          api.showToast("La comisión aún no publicó el grupo");
          return;
        }
        window.open(url, "_blank", "noopener");
      }}
      onEdit={() => {
        setDraftUrl(officialWhatsApp(api.state));
        setEditing(true);
      }}
      onDraftUrl={setDraftUrl}
      onSave={() => {
        if (api.saveWhatsapp(draftUrl)) setEditing(false);
      }}
      onCancel={() => setEditing(false)}
    />
  );
}
