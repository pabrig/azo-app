import { APP_TABS } from "../app/tabs";
import type { TabId } from "../domain/types";
import { TabNavIcon } from "./nav-icons";

function NavTabButton({
  item,
  selected,
  onChange,
  variant
}: {
  item: (typeof APP_TABS)[number];
  selected: boolean;
  onChange: (tab: TabId) => void;
  variant: "bottom" | "top";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(item.id)}
      aria-current={selected ? "page" : undefined}
      title={item.label}
      className={`nav-tab nav-tab--${variant} ${selected ? "nav-tab--active" : ""}`}
    >
      <span className="nav-tab-icon">
        <TabNavIcon tab={item.id} size={variant === "top" ? 18 : 20} />
      </span>
      {variant === "bottom" && item.mobileLines ? (
        <span className="nav-tab-label nav-tab-label--stacked">
          <span>{item.mobileLines[0]}</span>
          <span>{item.mobileLines[1]}</span>
        </span>
      ) : (
        <span className={`nav-tab-label ${item.mobileLines ? "nav-tab-label--stacked nav-tab-label--stacked-top" : ""}`}>
          {item.mobileLines ? (
            <>
              <span>{item.mobileLines[0]}</span>
              <span>{item.mobileLines[1]}</span>
            </>
          ) : (
            item.label
          )}
        </span>
      )}
    </button>
  );
}

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="app-bottom-nav lg:hidden" aria-label="Secciones principales">
      <div className="app-bottom-nav-inner">
        {APP_TABS.map((item) => (
          <NavTabButton key={item.id} item={item} selected={item.id === tab} onChange={onChange} variant="bottom" />
        ))}
      </div>
    </nav>
  );
}

/** Barra horizontal bajo el header (solo desktop). */
export function TopNav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="app-top-nav-wrap hidden lg:block" aria-label="Secciones principales">
      <div className="app-top-nav">
        {APP_TABS.map((item) => (
          <NavTabButton key={item.id} item={item} selected={item.id === tab} onChange={onChange} variant="top" />
        ))}
      </div>
    </nav>
  );
}
