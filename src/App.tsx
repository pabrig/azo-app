import { ChampionshipProvider } from "./app/ChampionshipProvider";
import { AppShell } from "./features/shell/AppShell";

export function App() {
  return (
    <ChampionshipProvider>
      <AppShell />
    </ChampionshipProvider>
  );
}
