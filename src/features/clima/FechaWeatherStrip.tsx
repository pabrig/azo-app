import type { ReactNode } from "react";
import type { FechaWeatherSnapshot } from "../../data/open-meteo";
import { windArrowRotationDeg } from "../../domain/wind-direction";
import { IconThermometer, IconWindArrow } from "./WeatherMetricIcons";
import { WeatherIcon } from "./WeatherIcon";

function Metric({
  icon,
  label,
  value,
  hint,
  featured = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`fecha-weather-metric${featured ? " fecha-weather-metric--featured" : ""}`}
    >
      <span className="fecha-weather-metric__icon">{icon}</span>
      <span className="fecha-weather-metric__label">{label}</span>
      <span className="fecha-weather-metric__value">{value}</span>
      {hint ? <span className="fecha-weather-metric__hint">{hint}</span> : null}
    </div>
  );
}

export function FechaWeatherStrip({
  loading,
  snapshot,
  error,
  onRetry
}: {
  loading: boolean;
  snapshot: FechaWeatherSnapshot | null;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div
        className="fecha-weather-panel fecha-weather-panel--loading"
        aria-busy="true"
        aria-label="Cargando pronóstico"
      >
        <div className="fecha-weather-grid">
          <div className="fecha-weather-metric">
            <span className="ui-skeleton ui-skeleton--icon" />
            <span className="ui-skeleton ui-skeleton--line" />
            <span className="ui-skeleton ui-skeleton--hint" />
          </div>
          <div className="fecha-weather-metric">
            <span className="ui-skeleton ui-skeleton--icon" />
            <span className="ui-skeleton ui-skeleton--line" />
            <span className="ui-skeleton ui-skeleton--hint" />
          </div>
          <div className="fecha-weather-metric">
            <span className="ui-skeleton ui-skeleton--icon" />
            <span className="ui-skeleton ui-skeleton--line" />
            <span className="ui-skeleton ui-skeleton--hint" />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="fecha-weather-panel">
        <p className="text-center text-[10px] text-slate-400 leading-snug px-2">
          {error}
        </p>
      </div>
    );
  }
  if (!snapshot) return null;

  const arrowRot = windArrowRotationDeg(snapshot.windDirectionDeg);

  return (
    <div className="fecha-weather-panel">
      <div className="fecha-weather-grid">
        <Metric
          featured
          icon={
            <IconWindArrow
              rotationDeg={arrowRot}
              className="w-4 h-4 text-cyan-400"
            />
          }
          label=""
          value={snapshot.windDirectionLabel}
          hint={`${snapshot.windKts} kn · ${snapshot.gustKts} kn`}
        />
        <Metric
          icon={
            <WeatherIcon
              kind={snapshot.conditionKind}
              className="w-4 h-4 text-sky-300"
            />
          }
          label=""
          value={snapshot.conditionLabel}
          hint={`${snapshot.precipProb}%`}
        />
        <Metric
          icon={<IconThermometer className="w-4 h-4 text-amber-300/90" />}
          label=""
          value={`${snapshot.tempC} °C`}
          hint={`${snapshot.tempMinC}–${snapshot.tempMaxC}°`}
        />
      </div>
    </div>
  );
}
