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
  variant: "bottom" | "side";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(item.id)}
      aria-current={selected ? "page" : undefined}
      aria-label={item.label}
      className={`nav-tab ${variant === "side" ? "nav-tab--side" : ""} ${selected ? "nav-tab--active" : ""}`}
    >
      <span className="nav-tab-icon">
        <TabNavIcon tab={item.id} size={variant === "side" ? 22 : 20} />
      </span>
      <span className="nav-tab-label nav-tab-label--full">{item.label}</span>
      <span className="nav-tab-label nav-tab-label--short">{item.shortLabel}</span>
    </button>
  );
}

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="app-bottom-nav" aria-label="Secciones principales">
      <div className="app-bottom-nav-inner">
        {APP_TABS.map((item) => (
          <NavTabButton key={item.id} item={item} selected={item.id === tab} onChange={onChange} variant="bottom" />
        ))}
      </div>
    </nav>
  );
}

export function SideNav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="app-side-nav" aria-label="Secciones principales">
      <p className="app-side-nav-title">Menú</p>
      <div className="app-side-nav-list">
        {APP_TABS.map((item) => (
          <NavTabButton key={item.id} item={item} selected={item.id === tab} onChange={onChange} variant="side" />
        ))}
      </div>
    </nav>
  );
}
