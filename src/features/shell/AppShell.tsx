import { useChampionship } from "../../app/championship-context";
import { isDevHost } from "../../app/dev-host";
import { CanalOficial } from "../canal/CanalOficial";
import { downloadDoc } from "../../data/download-doc";
import { currentEvent } from "../../domain/model";
import { fechaResultsStarted } from "../../domain/scoring";
import { FechaBriefCard } from "../fecha/FechaBriefCard";
import { Carga } from "../carga/Carga";
import { Fechas } from "../fechas/Fechas";
import { Inscripcion } from "../inscripcion/Inscripcion";
import { Placa } from "../resultados/Placa";
import { Ranking } from "../resultados/Ranking";
import { AppShellView } from "./AppShell.view";

export function AppShell() {
  const api = useChampionship();
  const event = currentEvent(api.state);
  return (
    <AppShellView
      sync={api.sync}
      toast={api.toast}
      tab={api.tab}
      showFechaBar={api.tab !== "ranking"}
      events={
        api.tab === "placa" ? api.state.events.filter(fechaResultsStarted) : api.state.events
      }
      activeFechaId={api.state.fecha}
      onSelectFecha={api.setFecha}
      showSync={isDevHost()}
      showLogout={api.isAdmin}
      onLogout={api.logoutCommission}
      onTab={api.setTab}
      canal={<CanalOficial />}
      fechaBrief={
        <FechaBriefCard
          event={event}
          onDownload={(kind) => {
            const doc = event?.[kind];
            if (!downloadDoc(doc, kind === "ar" ? "AR.pdf" : "IR.pdf")) {
              api.showToast("No hay archivo cargado");
            }
          }}
        />
      }
    >
      {api.tab === "inscripcion" ? <Inscripcion /> : null}
      {api.tab === "fechas" ? <Fechas /> : null}
      {api.tab === "carga" ? <Carga /> : null}
      {api.tab === "placa" ? <Placa /> : null}
      {api.tab === "ranking" ? <Ranking /> : null}
    </AppShellView>
  );
}
