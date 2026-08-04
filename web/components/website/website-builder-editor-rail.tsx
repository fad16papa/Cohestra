"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { WebsiteBuilderEditorTab } from "@/lib/website-builder-tour";

type WebsiteBuilderEditorRailProps = {
  activeTab: WebsiteBuilderEditorTab;
  onTabChange: (tab: WebsiteBuilderEditorTab) => void;
  topSlot?: ReactNode;
  designPanel: ReactNode;
  sectionsPanel: ReactNode;
  templatesPanel: ReactNode;
};

const TABS: { id: WebsiteBuilderEditorTab; label: string; tourAttr?: string }[] = [
  { id: "design", label: "Design", tourAttr: "website-builder-tab-design" },
  { id: "sections", label: "Sections", tourAttr: "website-builder-tab-sections" },
  { id: "templates", label: "Templates", tourAttr: "website-builder-tab-templates" },
];

export function WebsiteBuilderEditorRail({
  activeTab,
  onTabChange,
  topSlot,
  designPanel,
  sectionsPanel,
  templatesPanel,
}: WebsiteBuilderEditorRailProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {topSlot}

      <div
        className="inline-flex w-full rounded-lg border border-border-warm bg-card p-1"
        role="tablist"
        aria-label="Website builder sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`website-builder-tab-${tab.id}`}
            data-tour={tab.tourAttr}
            aria-selected={activeTab === tab.id}
            aria-controls={`website-builder-panel-${tab.id}`}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted-warm hover:bg-muted/60 hover:text-text-warm"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 space-y-3">
        <TabPanel id="design" activeTab={activeTab}>
          {designPanel}
        </TabPanel>
        <TabPanel id="sections" activeTab={activeTab}>
          {sectionsPanel}
        </TabPanel>
        <TabPanel id="templates" activeTab={activeTab}>
          {templatesPanel}
        </TabPanel>
      </div>
    </div>
  );
}

function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: WebsiteBuilderEditorTab;
  activeTab: WebsiteBuilderEditorTab;
  children: ReactNode;
}) {
  const isActive = activeTab === id;

  return (
    <div
      id={`website-builder-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`website-builder-tab-${id}`}
      hidden={!isActive}
      className={cn(!isActive && "hidden")}
    >
      {children}
    </div>
  );
}

export function useWebsiteBuilderEditorTab(
  initial: WebsiteBuilderEditorTab = "design"
): [WebsiteBuilderEditorTab, (tab: WebsiteBuilderEditorTab) => void] {
  const [activeTab, setActiveTab] = useState<WebsiteBuilderEditorTab>(initial);
  return [activeTab, setActiveTab];
}

/** Switch tab when tour requests it. */
export function useSyncTourTab(
  requestedTab: WebsiteBuilderEditorTab | undefined,
  setActiveTab: (tab: WebsiteBuilderEditorTab) => void
) {
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab, setActiveTab]);
}
