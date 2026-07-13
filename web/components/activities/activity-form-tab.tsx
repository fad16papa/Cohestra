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
  publishGateSavedFormNote,
} from "@/lib/form-schema-utils";
import {
  cloneFormTemplate,
  getFormTemplate,
  type FormTemplateId,
} from "@/lib/form-templates";

const publishedTemplateLockReason =
  "This activity is published. Launch templates replace the entire form, so they are disabled while live. Unpublish from the Overview tab to apply a template, then publish again when ready.";

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
  const draftPublishGateIssues = getPublishGateIssues(draftSchema);
  const savedPublishGateIssues = getPublishGateIssues(activity.formSchema);
  const previewKey = draftSchema.fields
    .map((field) => `${field.id}:${field.type}`)
    .join("|");

  useEffect(() => {
    setDraftSchema(normalizeFormSchema(activity.formSchema));
  }, [activity.formSchema, activity.id, activity.status]);

  function applyTemplate(templateId: FormTemplateId) {
    setError(null);
    setSuccess(null);
    setDraftSchema(cloneFormTemplate(templateId));
    setSuccess(
      `${getFormTemplate(templateId).name} template applied. Review the fields, then save the form.`
    );
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
      setSuccess("Form saved. New registrations will use this schema.");
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
      {isArchived ? (
        <p
          role="status"
          className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm"
        >
          This activity is archived. Form fields are read-only.
        </p>
      ) : null}

      {isPublished ? (
        <p
          role="status"
          className="rounded-lg border border-border-warm bg-muted/30 px-4 py-3 text-sm text-text-warm"
        >
          This form is live at{" "}
          <code className="rounded bg-muted px-1 py-0.5">/register/{activity.slug}</code>
          . You can adjust individual fields below and save — changes apply to new
          registrations only. To replace the whole form with a launch template,
          unpublish from the Overview tab first.
        </p>
      ) : null}

      {!isArchived ? (
        <div className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-section text-text-warm">Registration form</h3>
              <p className="text-sm text-text-muted-warm">
                Saved changes apply to new registrations only. Existing
                submissions stay unchanged.
              </p>
            </div>
            <Button
              type="button"
              disabled={isSaving || !isDirty || hasClientIssues}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving…" : "Save form"}
            </Button>
          </div>

          {hasClientIssues ? (
            <div role="alert" className="space-y-1 text-sm text-destructive">
              {clientIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {success ? (
            <p role="status" className="text-sm text-text-warm">
              {success}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isArchived && isDraft ? (
        <section className="space-y-3 rounded-xl border border-border-warm bg-muted/20 p-4">
          <div>
            <h3 className="text-section text-text-warm">Publish requirements</h3>
            <p className="mt-1 text-sm text-text-muted-warm">
              {publishGateSavedFormNote}
            </p>
          </div>

          {draftPublishGateIssues.length > 0 ? (
            <div role="alert" className="space-y-1">
              <p className="text-sm font-medium text-text-warm">Current draft</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                {draftPublishGateIssues.map((issue) => (
                  <li key={`draft-${issue}`}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-text-warm">
              Current draft meets publish requirements.
            </p>
          )}

          {isDirty ? (
            <div className="space-y-1 border-t border-border-warm pt-3">
              <p className="text-sm font-medium text-text-warm">
                Last saved form (used when publishing)
              </p>
              {savedPublishGateIssues.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                  {savedPublishGateIssues.map((issue) => (
                    <li key={`saved-${issue}`}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted-warm">
                  Saved form meets publish requirements. Save this draft, then
                  publish from Overview.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {!isArchived ? (
        <FormTemplatePicker
          onSelectTemplate={handleSelectTemplate}
          disabled={isSaving}
          locked={isPublished}
          lockedReason={isPublished ? publishedTemplateLockReason : undefined}
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-8">
        <FormFieldEditor
          schema={draftSchema}
          onChange={setDraftSchema}
          disabled={isArchived}
          className="min-w-0"
        />

        <section
          aria-labelledby="form-live-preview-heading"
          className="min-w-0 space-y-3 rounded-xl border border-border-warm bg-card p-4 sm:p-5"
        >
          <div>
            <h3
              id="form-live-preview-heading"
              className="text-section text-text-warm"
            >
              Live preview
            </h3>
            <p className="mt-1 text-sm text-text-muted-warm">
              How registrants will see this form on the public registration page.
            </p>
          </div>
          <div className="max-h-[min(36rem,70dvh)] overflow-y-auto overscroll-y-contain rounded-xl border border-border-warm bg-muted/20 p-4 [-webkit-overflow-scrolling:touch] sm:p-5">
            <RegistrationForm
              key={previewKey}
              schema={draftSchema}
              variant="preview"
            />
          </div>
        </section>
      </div>

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
