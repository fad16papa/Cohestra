"use client";

import { useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { FormTemplatePicker } from "@/components/activities/form-template-picker";
import { RegistrationForm } from "@/components/registration/registration-form";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  saveActivityFormSchema,
  type Activity,
  type ActivityFormSchema,
} from "@/lib/activities-api";
import {
  getFormSchemaClientIssues,
  getPublishGateIssues,
  normalizeFormSchema,
} from "@/lib/form-schema-utils";
import {
  cloneFormTemplate,
  getFormTemplate,
  type FormTemplateId,
} from "@/lib/form-templates";
import { cn } from "@/lib/utils";

const publishedTemplateLockReason =
  "Templates replace the entire form. Unpublish from Overview to apply one.";

type ActivityFormTabProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

export function ActivityFormTab({
  activity,
  onActivityUpdated,
}: ActivityFormTabProps) {
  const { authFetch } = useAuth();
  const [draftSchema, setDraftSchema] = useState<ActivityFormSchema>(() =>
    normalizeFormSchema(activity.formSchema)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<FormTemplateId | null>(null);

  const isArchived = activity.status === "archived";
  const isDraft = activity.status === "draft";
  const isPublished = activity.status === "published";
  const savedSchema = normalizeFormSchema(activity.formSchema);
  const isDirty = JSON.stringify(draftSchema) !== JSON.stringify(savedSchema);
  const clientIssues = getFormSchemaClientIssues(draftSchema);
  const hasClientIssues = clientIssues.length > 0;
  const draftPublishGateIssues = getPublishGateIssues(draftSchema, {
    slug: activity.slug,
  });
  const savedPublishGateIssues = getPublishGateIssues(activity.formSchema, {
    slug: activity.slug,
  });
  const previewKey = draftSchema.fields
    .map((field) => `${field.id}:${field.type}`)
    .join("|");

  const showPublishGate =
    isDraft &&
    (draftPublishGateIssues.length > 0 ||
      (isDirty && savedPublishGateIssues.length > 0));

  useEffect(() => {
    setDraftSchema(normalizeFormSchema(activity.formSchema));
  }, [activity.formSchema, activity.id, activity.status]);

  function applyTemplate(templateId: FormTemplateId) {
    setError(null);
    setSuccess(null);
    setDraftSchema(cloneFormTemplate(templateId));
    setSuccess(`${getFormTemplate(templateId).name} template applied. Save when ready.`);
  }

  function handleSelectTemplate(templateId: FormTemplateId) {
    if (isPublished || isArchived) {
      return;
    }

    setPendingTemplateId(templateId);
  }

  function confirmApplyTemplate() {
    if (!pendingTemplateId) {
      return;
    }

    applyTemplate(pendingTemplateId);
    setPendingTemplateId(null);
  }

  const pendingTemplate = pendingTemplateId
    ? getFormTemplate(pendingTemplateId)
    : null;

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updated = await saveActivityFormSchema(
        authFetch,
        activity.id,
        draftSchema
      );
      onActivityUpdated(updated);
      setDraftSchema(normalizeFormSchema(updated.formSchema));
      setSuccess("Form saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save form schema."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {!isArchived ? (
        <div
          className={cn(
            "sticky top-0 z-10 -mx-1 flex flex-col gap-3 border-b border-border-warm bg-background/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between",
            isDirty && "border-primary/20"
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-warm">
              Registration form
            </p>
            {isPublished ? (
              <p className="text-xs text-text-muted-warm">
                Live — changes apply to new registrations only.
              </p>
            ) : isDirty ? (
              <p className="text-xs text-text-muted-warm">Unsaved changes</p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isSaving || !isDirty || hasClientIssues}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save form"}
          </Button>
        </div>
      ) : null}

      {isArchived ? (
        <p role="status" className="text-sm text-text-muted-warm">
          Archived — form is read-only.
        </p>
      ) : null}

      {hasClientIssues ? (
        <ul role="alert" className="list-disc space-y-0.5 pl-5 text-sm text-destructive">
          {clientIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {showPublishGate ? (
        <div role="alert" className="space-y-2 text-sm">
          {draftPublishGateIssues.length > 0 ? (
            <div>
              <p className="font-medium text-text-warm">Before you can publish</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-destructive">
                {draftPublishGateIssues.map((issue) => (
                  <li key={`draft-${issue}`}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {isDirty && savedPublishGateIssues.length > 0 ? (
            <div>
              <p className="font-medium text-text-warm">Saved form (used when publishing)</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-destructive">
                {savedPublishGateIssues.map((issue) => (
                  <li key={`saved-${issue}`}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {success ? (
        <p role="status" className="text-sm text-text-muted-warm">
          {success}
        </p>
      ) : null}

      {!isArchived ? (
        <FormTemplatePicker
          onSelectTemplate={handleSelectTemplate}
          disabled={isSaving}
          locked={isPublished}
          lockedReason={isPublished ? publishedTemplateLockReason : undefined}
        />
      ) : null}

      <FormFieldEditor
        schema={draftSchema}
        onChange={setDraftSchema}
        disabled={isArchived}
        className="min-w-0"
      />

      <section
        aria-labelledby="form-live-preview-heading"
        className="min-w-0 space-y-3 border-t border-border-warm pt-8"
      >
        <h3
          id="form-live-preview-heading"
          className="text-section text-text-warm"
        >
          Preview
        </h3>
        <div className="max-h-[min(36rem,70dvh)] overflow-y-auto overscroll-y-contain rounded-xl border border-border-warm bg-muted/20 p-4 [-webkit-overflow-scrolling:touch] sm:p-5">
          <RegistrationForm
            key={previewKey}
            schema={draftSchema}
            variant="preview"
          />
        </div>
      </section>

      <AlertDialog
        open={pendingTemplateId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTemplateId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-muted-warm">
                <LayoutTemplate className="size-4" aria-hidden />
              </span>
              <div className="space-y-2">
                <AlertDialogTitle>
                  Apply {pendingTemplate ? `"${pendingTemplate.name}"` : "this template"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This replaces all current form fields with the template preset. Any
                  unsaved changes will be lost.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyTemplate}>
              Apply template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
