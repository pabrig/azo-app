import { useChampionship } from "../../app/championship-context";
import { isDevHost } from "../../app/dev-host";
import { CanalOficial } from "../canal/CanalOficial";
import { Carga } from "../carga/Carga";
import { Fechas } from "../fechas/Fechas";
import { Inscripcion } from "../inscripcion/Inscripcion";
import { Placa } from "../resultados/Placa";
import { Ranking } from "../resultados/Ranking";
import { AppShellView } from "./AppShell.view";

export function AppShell() {
  const api = useChampionship();
  return (
    <AppShellView
      sync={api.sync}
      toast={api.toast}
      tab={api.tab}
      showFechaBar={api.tab !== "ranking"}
      events={api.state.events}
      activeFechaId={api.state.fecha}
      onSelectFecha={api.setFecha}
      showSync={isDevHost()}
      showLogout={api.isAdmin}
      onLogout={api.logoutCommission}
      onTab={api.setTab}
      canal={<CanalOficial />}
    >
      {api.tab === "inscripcion" ? <Inscripcion /> : null}
      {api.tab === "fechas" ? <Fechas /> : null}
      {api.tab === "carga" ? <Carga /> : null}
      {api.tab === "placa" ? <Placa /> : null}
      {api.tab === "ranking" ? <Ranking /> : null}
    </AppShellView>
  );
}
