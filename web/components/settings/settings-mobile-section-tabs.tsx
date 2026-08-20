"use client";

import type { SettingsSectionId, SettingsSectionMeta } from "@/components/settings/settings-sections";
import { cn } from "@/lib/utils";

type SettingsMobileSectionTabsProps = {
  sections: SettingsSectionMeta[];
  activeId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
};

export function SettingsMobileSectionTabs({
  sections,
  activeId,
  onSelect,
}: SettingsMobileSectionTabsProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="lg:hidden"
    >
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border-warm bg-card text-text-muted-warm hover:text-text-warm"
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
