import { classLogoSrc } from "./class-logos";

export function ClassChips({
  names,
  value,
  onChange,
  title = "Clases",
  showAll = true
}: {
  names: string[];
  value: string;
  onChange: (value: string) => void;
  /** Encabezado sobre la fila de pills (vacío para ocultar). */
  title?: string;
  /** Carga: true. Placa/Ranking: false (siempre una clase). */
  showAll?: boolean;
}) {
  const items = (showAll ? ["ALL", ...names] : names) as readonly string[];

  return (
    <div className="class-chips-block">
      {title ? <p className="class-chips-title">{title}</p> : null}
      <div className="class-chips-scroll class-chips-row" role="tablist" aria-label={title || "Filtrar por clase"}>
        {items.map((name) => {
          const selected = value === name;
          const label = name === "ALL" ? "Todas" : name;
          const logo = name === "ALL" ? null : classLogoSrc(name);
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(name)}
              className={`class-chip ${selected ? "class-chip--selected" : ""} ${logo ? "class-chip--with-logo" : "class-chip--text-only"}`}
            >
              {logo ? (
                <span className={`class-chip-logo ${logoVariant(name)}`} aria-hidden>
                  <img src={logo} alt="" decoding="async" />
                </span>
              ) : null}
              <span className="class-chip-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function logoVariant(className: string): string {
  if (className === "Optimist") return "class-chip-logo--optimist";
  if (className === "ILCA 6" || className === "ILCA 7") return "class-chip-logo--ilca";
  return "";
}
