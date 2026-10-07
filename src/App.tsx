import { ChampionshipProvider } from "./app/ChampionshipProvider";
import { AppShell } from "./features/shell/AppShell";
import { ConfirmProvider } from "./ui/confirm";

export function App() {
  return (
    <ConfirmProvider>
      <ChampionshipProvider>
        <AppShell />
      </ChampionshipProvider>
    </ConfirmProvider>
  );
}
