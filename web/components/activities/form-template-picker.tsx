"use client";

import { Pencil, Trash2 } from "lucide-react";

import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { Button } from "@/components/ui/button";
import {
  formTemplates,
  type FormTemplateId,
} from "@/lib/form-templates";
import {
  formTemplateUpgradePlan,
  isFormTemplateSaveBlocked,
  type FormTemplateUsage,
  type SavedFormTemplateSummary,
} from "@/lib/form-templates-api";
import { cn } from "@/lib/utils";

type FormTemplatePickerProps = {
  onSelectTemplate: (templateId: FormTemplateId) => void;
  onSelectSavedTemplate: (template: SavedFormTemplateSummary) => void;
  onSaveCurrentDraft: () => void;
  onRenameSavedTemplate: (template: SavedFormTemplateSummary) => void;
  onReplaceSavedTemplate: (template: SavedFormTemplateSummary) => void;
  onDeleteSavedTemplate: (template: SavedFormTemplateSummary) => void;
  savedTemplates: SavedFormTemplateSummary[];
  usage: FormTemplateUsage;
  plan: string;
  isTenantAdmin: boolean;
  disabled?: boolean;
  locked?: boolean;
  lockedReason?: string;
  templatesLoading?: boolean;
  hasClientIssues?: boolean;
};

function SlotMeter({ usage }: { usage: FormTemplateUsage }) {
  const percent =
    usage.limit <= 0 ? 0 : Math.min(100, Math.round((usage.used * 100) / usage.limit));
  const blocked = isFormTemplateSaveBlocked(usage);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-muted-warm">Saved template slots</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            blocked ? "text-destructive" : "text-text-warm"
          )}
        >
          {usage.used}/{usage.limit}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Saved template slots: ${percent}% used`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            blocked ? "bg-destructive" : percent >= 80 ? "bg-gold" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function FormTemplatePicker({
  onSelectTemplate,
  onSelectSavedTemplate,
  onSaveCurrentDraft,
  onRenameSavedTemplate,
  onReplaceSavedTemplate,
  onDeleteSavedTemplate,
  savedTemplates,
  usage,
  plan,
  isTenantAdmin,
  disabled = false,
  locked = false,
  lockedReason,
  templatesLoading = false,
  hasClientIssues = false,
}: FormTemplatePickerProps) {
  const isDisabled = disabled || locked;
  const saveBlocked = isFormTemplateSaveBlocked(usage);
  const upgradePlan = formTemplateUpgradePlan(plan);

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-border-warm bg-muted/20 p-4">
        <div>
          <h3 className="text-section text-text-warm">Launch templates</h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Start from a preset field set based on your existing lead engines.
            Applying a template replaces all current form fields.
          </p>
        </div>

        {locked && lockedReason ? (
          <p
            role="status"
            className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm"
          >
            {lockedReason}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {formTemplates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col rounded-lg border border-border-warm bg-card p-4"
            >
              <p className="font-medium text-text-warm">{template.name}</p>
              <p className="mt-1 flex-1 text-xs text-text-muted-warm">
                {template.description}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={isDisabled}
                title={
                  locked
                    ? "Unpublish this activity to apply a launch template"
                    : undefined
                }
                aria-disabled={isDisabled}
                onClick={() => onSelectTemplate(template.id)}
              >
                Use template
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-muted-warm">
          Customize fields after applying, then save the form.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border-warm bg-muted/20 p-4">
        <div className="space-y-2">
          <h3 className="text-section text-text-warm">Your saved templates</h3>
          <p className="text-sm text-text-muted-warm">
            Save this draft as a reusable recipe and apply it to another unpublished
            activity.
          </p>
          <SlotMeter usage={usage} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saveBlocked || hasClientIssues}
            onClick={onSaveCurrentDraft}
          >
            Save current draft
          </Button>
        </div>
        {hasClientIssues ? (
          <p role="status" className="text-sm text-destructive">
            Fix form validation issues before saving or replacing a template.
          </p>
        ) : null}

        {saveBlocked && upgradePlan ? (
          <UpgradePanel
            title="Save more form recipes"
            description={
              plan.toLowerCase() === "basic"
                ? "Core saves up to 5 form recipes for every new session."
                : "Pro saves up to 25 form recipes for every new session."
            }
            requiredPlan={upgradePlan}
            isTenantAdmin={isTenantAdmin}
          />
        ) : saveBlocked ? (
          <p role="status" className="text-sm text-text-muted-warm">
            Saved form templates are at capacity ({usage.used}/{usage.limit}). Delete a
            template to save a new one.
          </p>
        ) : null}

        {templatesLoading ? (
          <p className="text-sm text-text-muted-warm">Loading saved templates…</p>
        ) : savedTemplates.length === 0 ? (
          <p className="text-sm text-text-muted-warm">
            No saved templates yet. Build a form and save it for next time.
          </p>
        ) : (
          <ul className="space-y-2">
            {savedTemplates.map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-warm bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-warm">
                    {template.name}
                  </p>
                  <p className="text-xs text-text-muted-warm">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => onSelectSavedTemplate(template)}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || hasClientIssues}
                    onClick={() => onReplaceSavedTemplate(template)}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRenameSavedTemplate(template)}
                    aria-label={`Rename ${template.name}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Rename
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onDeleteSavedTemplate(template)}
                    aria-label={`Delete ${template.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
