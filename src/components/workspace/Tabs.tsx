import { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, active, onChange }: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = items.findIndex((t) => t.id === active);
    if (idx === -1) return;

    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;

    e.preventDefault();
    const target = items[next];
    onChange(target.id);
    tabRefs.current[target.id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Study tools"
      onKeyDown={onKeyDown}
      className="flex gap-1 border-b border-border overflow-x-auto"
    >
      {items.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors duration-150 cursor-pointer ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={active !== id}
      className="pt-6"
    >
      {children}
    </div>
  );
}