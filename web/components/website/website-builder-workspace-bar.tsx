"use client";

import { cn } from "@/lib/utils";
import type { WebsiteBuilderEditorTab } from "@/lib/website-builder-tour";
import type { WebsiteBuilderWorkspaceMode } from "@/lib/website-builder-workspace";

type WebsiteBuilderWorkspaceBarProps = {
  editorTab: WebsiteBuilderEditorTab;
  onEditorTabChange: (tab: WebsiteBuilderEditorTab) => void;
  workspaceMode: WebsiteBuilderWorkspaceMode;
  onWorkspaceModeChange: (mode: WebsiteBuilderWorkspaceMode) => void;
  splitAvailable: boolean;
  isMobile: boolean;
  mobileWorkspace: "edit" | "preview";
  onMobileWorkspaceChange: (workspace: "edit" | "preview") => void;
};

const EDITOR_TABS: {
  id: WebsiteBuilderEditorTab;
  label: string;
  tourAttr?: string;
}[] = [
  { id: "design", label: "Design", tourAttr: "website-builder-tab-design" },
  {
    id: "sections",
    label: "Sections",
    tourAttr: "website-builder-tab-sections",
  },
  {
    id: "templates",
    label: "Templates",
    tourAttr: "website-builder-tab-templates",
  },
];

const DESKTOP_MODES: {
  id: WebsiteBuilderWorkspaceMode;
  label: string;
}[] = [
  { id: "build", label: "Build" },
  { id: "split", label: "Split" },
  { id: "preview", label: "Preview" },
];

function TabButton({
  active,
  label,
  onClick,
  id,
  tourAttr,
  ariaControls,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  id?: string;
  tourAttr?: string;
  ariaControls?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      data-tour={tourAttr}
      aria-selected={active}
      aria-controls={ariaControls}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-text-muted-warm hover:bg-muted/60 hover:text-text-warm",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function WebsiteBuilderWorkspaceBar({
  editorTab,
  onEditorTabChange,
  workspaceMode,
  onWorkspaceModeChange,
  splitAvailable,
  isMobile,
  mobileWorkspace,
  onMobileWorkspaceChange,
}: WebsiteBuilderWorkspaceBarProps) {
  if (isMobile) {
    return (
      <div
        className="inline-flex w-full rounded-lg border border-border-warm bg-card p-1"
        role="tablist"
        aria-label="Builder workspace"
      >
        <TabButton
          active={mobileWorkspace === "edit"}
          label="Edit"
          onClick={() => onMobileWorkspaceChange("edit")}
        />
        <TabButton
          active={mobileWorkspace === "preview"}
          label="Preview"
          onClick={() => onMobileWorkspaceChange("preview")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="inline-flex w-full rounded-lg border border-border-warm bg-card p-1 sm:w-auto"
        role="tablist"
        aria-label="Website builder sections"
      >
        {EDITOR_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            id={`website-builder-tab-${tab.id}`}
            tourAttr={tab.tourAttr}
            ariaControls={`website-builder-panel-${tab.id}`}
            active={editorTab === tab.id}
            label={tab.label}
            onClick={() => onEditorTabChange(tab.id)}
          />
        ))}
      </div>

      <div
        className="inline-flex w-full rounded-lg border border-border-warm bg-card p-1 sm:w-auto"
        role="tablist"
        aria-label="Workspace view"
      >
        {DESKTOP_MODES.filter(
          (mode) => mode.id !== "split" || splitAvailable,
        ).map((mode) => (
          <TabButton
            key={mode.id}
            active={workspaceMode === mode.id}
            label={mode.label}
            onClick={() => onWorkspaceModeChange(mode.id)}
          />
        ))}
      </div>
    </div>
  );
}
