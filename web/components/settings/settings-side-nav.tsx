"use client";

import { cn } from "@/lib/utils";

export type SettingsNavItem = {
  id: string;
  label: string;
};

type SettingsSideNavProps = {
  items: SettingsNavItem[];
  className?: string;
};

export function SettingsSideNav({ items, className }: SettingsSideNavProps) {
  if (items.length === 0) {
    return null;
  }

  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      aria-label="Settings sections"
      className={cn("space-y-1", className)}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.id)}
          className={cn(
            "block w-full rounded-lg px-3 py-2 text-left text-sm text-text-muted-warm",
            "transition-colors hover:bg-muted/60 hover:text-text-warm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function SettingsMobileNav({ items }: SettingsSideNavProps) {
  if (items.length === 0) {
    return null;
  }

  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="lg:hidden">
      <label htmlFor="settings-jump" className="sr-only">
        Jump to section
      </label>
      <select
        id="settings-jump"
        className="w-full rounded-xl border border-border-warm bg-background px-3 py-2.5 text-sm text-text-warm shadow-xs"
        defaultValue=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) {
            scrollToSection(value);
            event.target.value = "";
          }
        }}
      >
        <option value="" disabled>
          Jump to section…
        </option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
