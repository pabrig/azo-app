import type { FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import { classNames, currentEvent, effectiveClassFilter, filteredSailors, formatDay } from "../../domain/model";
import { canonicalScoreCell } from "../../domain/score-entry";
import { dateNet, effectiveDiscardsAllowed, formatRaceCellDisplay, raceIndexesWithResults } from "../../domain/scoring";
import type { Sailor } from "../../domain/types";
import { CargaView } from "./Carga.view";

export function Carga() {
  const api = useChampionship();
  const event = currentEvent(api.state);
  const subtitle = event
    ? `${event.name} · ${formatDay(event.date)} ${event.time} · ${event.racesCount} regata${event.racesCount > 1 ? "s" : ""} · ${effectiveDiscardsAllowed(event)} descarte${effectiveDiscardsAllowed(event) === 1 ? "" : "s"} neto`
    : "Creá una fecha en la pestaña Fechas.";

  function onUnlock(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const pin = String(data.get("pin") || "");
    if (api.unlockAdmin(pin)) formEvent.currentTarget.reset();
  }

  return (
    <CargaView
      locked={!api.isAdmin}
      hasEvent={Boolean(event)}
      subtitle={subtitle}
      classNames={classNames(api.state)}
      classFilter={effectiveClassFilter(api.state)}
      racesCount={event?.racesCount || 0}
      sailors={event ? filteredSailors(api.state, event.id) : []}
      scoresFor={(sailorId) => (event ? event.scores[sailorId] || [] : [])}
      onUnlock={onUnlock}
      onClassFilter={api.setClassFilter}
      onAddRace={api.addRace}
      onRemoveRace={api.removeRace}
      onScore={api.updateScore}
      raceCellLegend={
        event
          ? (sailor: Sailor, raceIndex: number) => {
              if (!raceIndexesWithResults(event).includes(raceIndex)) return null;
              const raw = event.scores[sailor.id]?.[raceIndex];
              const { discardedRaceIndexes } = dateNet(api.state, sailor, event.id);
              if (!canonicalScoreCell(raw) && !discardedRaceIndexes.includes(raceIndex)) return null;
              return formatRaceCellDisplay(raw, raceIndex, discardedRaceIndexes);
            }
          : undefined
      }
    />
  );
}
