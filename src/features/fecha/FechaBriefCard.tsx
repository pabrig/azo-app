import type { Fecha } from "../../domain/types";
import { Card } from "../../ui/primitives";
import { FechaWeatherStrip } from "../clima/FechaWeatherStrip";
import { useFechaWeather } from "../clima/useFechaWeather";

export function FechaBriefCard({
  event,
  onDownload
}: {
  event: Fecha | null;
  onDownload: (kind: "ar" | "ir") => void;
}) {
  const { show, loading, snapshot, error, retry } = useFechaWeather(event);

  return (
    <Card className="space-y-2 text-sm">
      {event ? (
        <>
          <div className="fecha-brief-head">
            <p className="fecha-brief-head__info min-w-0 text-center leading-tight">
              <span className="fecha-brief-head__kicker">Próxima</span>
              <span className="fecha-brief-head__dot">·</span>
              <span className="fecha-brief-head__name">{event.name}</span>
              <span className="fecha-brief-head__when">
                {" "}
                · {event.date
                  ? formatBriefDay(event.date)
                  : "día a confirmar"}{" "}
                · {event.time || "12:00"} hs
              </span>
            </p>
            {show ? (
              <FechaWeatherStrip loading={loading} snapshot={snapshot} error={error} onRetry={retry} />
            ) : null}
          </div>
          <div className="fecha-brief-docs flex gap-1.5">
            <button
              type="button"
              onClick={() => onDownload("ar")}
              className="fecha-brief-docs__btn"
            >
              Descargar AR
            </button>
            <button
              type="button"
              onClick={() => onDownload("ir")}
              className="fecha-brief-docs__btn"
            >
              Descargar IR
            </button>
          </div>
        </>
      ) : (
        <p className="text-slate-400 text-sm">
          Todavía no hay fechas del campeonato.
        </p>
      )}
    </Card>
  );
}

function formatBriefDay(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
