"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SiteSectionsDocument } from "@/lib/public-site-api";
import type { SavedSiteTemplate, SitePageAdmin } from "@/lib/site-admin-api";
import {
  SITE_BUILT_IN_PRESETS,
  type SiteBuiltInPresetId,
} from "@/lib/site-templates";
import { cn } from "@/lib/utils";

type WebsiteTemplatesPanelProps = {
  adminData: SitePageAdmin;
  draft: SiteSectionsDocument;
  disabled: boolean;
  recoveryDisabled: boolean;
  formatLastSaved: (iso: string) => string;
  onApplyPreset: (presetId: SiteBuiltInPresetId) => void;
  onSaveTemplate: () => void;
  onApplySavedTemplate: (template: SavedSiteTemplate) => void;
  onDeleteSavedTemplate: (template: SavedSiteTemplate) => void;
  onRevertPublished: () => void;
};

export function WebsiteTemplatesPanel({
  adminData,
  draft,
  disabled,
  recoveryDisabled,
  formatLastSaved,
  onApplyPreset,
  onSaveTemplate,
  onApplySavedTemplate,
  onDeleteSavedTemplate,
  onRevertPublished,
}: WebsiteTemplatesPanelProps) {
  const [open, setOpen] = useState(false);
  const savedCount = adminData.savedTemplates.length;

  return (
    <section className="overflow-hidden rounded-xl border border-border-warm bg-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div>
          <h3 className="text-section text-text-warm">Templates &amp; recovery</h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            {open
              ? "Built-in layouts, saved templates, and revert options"
              : `${SITE_BUILT_IN_PRESETS.length} presets · ${savedCount} saved template${savedCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-5 shrink-0 text-text-muted-warm transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border-warm px-4 py-4 sm:px-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-warm">Built-in presets</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SITE_BUILT_IN_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-lg border border-border-warm bg-surface-warm/30 p-3"
                >
                  <p className="text-sm font-medium text-text-warm">{preset.label}</p>
                  <p className="mt-1 text-xs text-text-muted-warm">{preset.description}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={recoveryDisabled}
                    onClick={() => onApplyPreset(preset.id)}
                  >
                    Use {preset.label}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted-warm">
              Applies to your draft only. Site name, hero image, and accent are kept;
              your logo returns to the default platform mark.
            </p>
          </div>

          <div className="space-y-3 border-t border-border-warm pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-warm">Your saved templates</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || draft.sections.length === 0}
                onClick={onSaveTemplate}
              >
                Save current layout
              </Button>
            </div>
            {savedCount === 0 ? (
              <p className="text-sm text-text-muted-warm">
                No saved templates yet. Build a layout and save it for next time.
              </p>
            ) : (
              <ul className="space-y-2">
                {adminData.savedTemplates.map((template) => (
                  <li
                    key={template.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-warm p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-warm">{template.name}</p>
                      <p className="text-xs text-text-muted-warm">
                        {template.sectionCount} section
                        {template.sectionCount === 1 ? "" : "s"} · saved{" "}
                        {formatLastSaved(template.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={recoveryDisabled}
                        onClick={() => onApplySavedTemplate(template)}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onDeleteSavedTemplate(template)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {adminData.canRevertPublished ? (
            <div className="space-y-2 border-t border-border-warm pt-4">
              <p className="text-sm font-medium text-text-warm">Revert live site</p>
              <p className="text-xs text-text-muted-warm">
                {adminData.previousPublishedAt
                  ? `Restore the homepage published ${formatLastSaved(adminData.previousPublishedAt)}.`
                  : "Restore the previous published homepage."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={recoveryDisabled}
                onClick={onRevertPublished}
              >
                Revert to last published
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
