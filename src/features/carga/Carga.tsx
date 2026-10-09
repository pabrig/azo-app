import type { FormEvent } from "react";
import { useChampionship } from "../../app/championship-context";
import { classNames, currentEvent, filteredSailors, formatDay, resultsClassFilter } from "../../domain/model";
import { clampRacesCount } from "../../domain/race-slots";
import { canonicalScoreCell } from "../../domain/score-entry";
import { dateNet, formatRaceCellDisplay, formatRaceDiscardSummary, raceIndexesWithResults } from "../../domain/scoring";
import type { Sailor } from "../../domain/types";
import { CargaView } from "./Carga.view";

export function Carga() {
  const api = useChampionship();
  const event = currentEvent(api.state);
  const filter = resultsClassFilter(api.state);
  const subtitle = event
    ? `${event.name} · ${formatDay(event.date)} ${event.time}`
    : "Creá una fecha en la pestaña Fechas.";
  const summary = event ? formatRaceDiscardSummary(event) : null;
  const racesCount = event ? clampRacesCount(event.racesCount) : 0;

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
      summaryLine={summary?.line || ""}
      classNames={classNames(api.state)}
      classFilter={filter}
      racesCount={racesCount}
      sailors={event ? filteredSailors({ ...api.state, classFilter: filter }, event.id) : []}
      scoresFor={(sailorId) => (event ? event.scores[sailorId] || [] : [])}
      onUnlock={onUnlock}
      onClassFilter={api.setClassFilter}
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
