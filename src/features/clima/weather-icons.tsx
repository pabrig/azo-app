import type { WeatherConditionKind } from "../../domain/weather-codes";

export function WeatherIcon({ kind, className = "w-5 h-5" }: { kind: WeatherConditionKind; className?: string }) {
  if (kind === "sun") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (kind === "rain" || kind === "storm") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.5 13.5A4.5 4.5 0 0 1 12 9a4.5 4.5 0 0 1 4.5 4.5H7.5zM8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (kind === "fog") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 14h16M6 18h12M5 10h14" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14a4 4 0 0 1 7.5-1.5A3.5 3.5 0 1 1 18 14H7z" />
    </svg>
  );
}
