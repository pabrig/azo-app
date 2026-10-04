import { useChampionship } from "../../app/championship-context";
import { officialWhatsApp } from "../../domain/model";
import { CanalOficialView } from "./CanalOficial.view";

export function CanalOficial() {
  const api = useChampionship();
  return (
    <CanalOficialView
      isAdmin={api.isAdmin}
      onOpen={() => {
        const url = officialWhatsApp(api.state);
        if (!url) {
          api.showToast("La comisión aún no publicó el grupo");
          return;
        }
        window.open(url, "_blank", "noopener");
      }}
      onEdit={api.requestWhatsappFocus}
    />
  );
}
