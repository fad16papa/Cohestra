"use client";

import { Button } from "@/components/ui/button";
import {
  formTemplates,
  type FormTemplateId,
} from "@/lib/form-templates";

type FormTemplatePickerProps = {
  onSelectTemplate: (templateId: FormTemplateId) => void;
  disabled?: boolean;
  locked?: boolean;
  lockedReason?: string;
};

export function FormTemplatePicker({
  onSelectTemplate,
  disabled = false,
  locked = false,
  lockedReason,
}: FormTemplatePickerProps) {
  const isDisabled = disabled || locked;

  return (
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
        Templates match the proposal field sets in{" "}
        <code className="rounded bg-muted px-1 py-0.5">addendum.md</code>.
        Customize fields after applying, then save the form.
      </p>
    </section>
  );
}
