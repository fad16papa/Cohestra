"use client";

import { useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { FormTemplatePicker } from "@/components/activities/form-template-picker";
import { PipingCheatsheet } from "@/components/activities/piping-cheatsheet";
import { RegistrationForm } from "@/components/registration/registration-form";
import { RegistrationIntroCopy } from "@/components/registration/registration-intro-copy";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
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
  type FormSchemaMeta,
} from "@/lib/activities-api";
import {
  getFormSchemaClientIssues,
  getPublishGateIssues,
  mergeFormSchemaMeta,
  normalizeFormSchema,
} from "@/lib/form-schema-utils";
import { substitutePipingPreview } from "@/lib/registration-piping";
import {
  cloneFormTemplate,
  getFormTemplate,
  type FormTemplateId,
} from "@/lib/form-templates";
import { applyMissingStepBuckets } from "@/lib/form-steps";
import { isCoreOrAbove, isProPlan } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";

const publishedTemplateLockReason =
  "Templates replace the entire form. Unpublish from Overview to apply one.";

type ActivityFormTabProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function ActivityFormTab({
  activity,
  onActivityUpdated,
  onDirtyChange,
}: ActivityFormTabProps) {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const plan = shell?.plan ?? "Basic";
  const recipesLocked = !isCoreOrAbove(plan);
  const corePlusLocked = !isCoreOrAbove(plan);
  const stepsLocked = !isProPlan(plan);
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

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const clientIssues = getFormSchemaClientIssues(draftSchema);
  const hasClientIssues = clientIssues.length > 0;
  const draftPublishGateIssues = getPublishGateIssues(draftSchema, {
    slug: activity.slug,
  });
  const savedPublishGateIssues = getPublishGateIssues(activity.formSchema, {
    slug: activity.slug,
  });
  const previewKey = [
    draftSchema.meta?.splitIntoSteps ? "steps" : "page",
    ...draftSchema.fields.map(
      (field) =>
        `${field.id}:${field.type}:${field.step ?? ""}:${field.visibleWhen?.fieldId ?? ""}:${field.visibleWhen?.equals ?? ""}:${field.visibleWhen?.notEquals ?? ""}`
    ),
  ].join("|");
  const introMarkdown = draftSchema.meta?.introMarkdown ?? null;
  const successCopyMarkdown = draftSchema.meta?.successCopyMarkdown ?? null;
  const confirmationEmailSubject = draftSchema.meta?.confirmationEmailSubject ?? null;
  const confirmationEmailBodyMarkdown =
    draftSchema.meta?.confirmationEmailBodyMarkdown ?? null;
  const successCopyPreview = substitutePipingPreview(successCopyMarkdown, draftSchema);

  function insertIntoMetaField(
    field: keyof Pick<
      FormSchemaMeta,
      "successCopyMarkdown" | "confirmationEmailSubject" | "confirmationEmailBodyMarkdown"
    >,
    token: string,
    currentValue: string | null
  ) {
    setDraftSchema((current) => ({
      ...current,
      meta: mergeFormSchemaMeta(current, {
        [field]: `${currentValue ?? ""}${token}`,
      }),
    }));
  }

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
        applyMissingStepBuckets(draftSchema)
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

      <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
        <div>
          <h3 className="text-section text-text-warm">Intro copy</h3>
          <p className="mt-0.5 text-sm text-text-muted-warm">
            Optional welcome text shown above the registration fields on the public page.
          </p>
        </div>
        <textarea
          id="form-intro-markdown"
          rows={4}
          maxLength={4000}
          value={introMarkdown ?? ""}
          disabled={isArchived || isSaving}
          placeholder="Welcome! Tell registrants what to expect…"
          className="flex min-h-[5rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          onChange={(event) => {
            const nextIntro = event.target.value.trim() ? event.target.value : null;
            setDraftSchema((current) => ({
              ...current,
              meta: mergeFormSchemaMeta(current, { introMarkdown: nextIntro }),
            }));
          }}
        />
        <p className="text-xs text-text-muted-warm">
          Plain text and paragraph breaks only. HTML is stripped on the public page.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-section text-text-warm">Thank-you copy</h3>
            <p className="mt-0.5 text-sm text-text-muted-warm">
              Optional message on the success screen after submit. Use tokens like{" "}
              <code className="text-xs">{`{{full_name}}`}</code>.
            </p>
          </div>
          <PipingCheatsheet
            schema={draftSchema}
            disabled={isArchived || isSaving}
            onInsert={(token) =>
              insertIntoMetaField("successCopyMarkdown", token, successCopyMarkdown)
            }
          />
        </div>
        <textarea
          id="form-success-copy-markdown"
          rows={3}
          maxLength={2000}
          value={successCopyMarkdown ?? ""}
          disabled={isArchived || isSaving}
          placeholder="See you Saturday, {{full_name}}."
          className="flex min-h-[4rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          onChange={(event) => {
            const next = event.target.value.trim() ? event.target.value : null;
            setDraftSchema((current) => ({
              ...current,
              meta: mergeFormSchemaMeta(current, { successCopyMarkdown: next }),
            }));
          }}
        />
        {successCopyPreview ? (
          <div className="rounded-lg border border-dashed border-border-warm bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              Preview
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text-warm">{successCopyPreview}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-section text-text-warm">Confirmation email</h3>
            <p className="mt-0.5 text-sm text-text-muted-warm">
              Optional subject and closing message. Layout and hero stay on your registration
              theme.
            </p>
          </div>
          <PipingCheatsheet
            schema={draftSchema}
            disabled={isArchived || isSaving}
            onInsert={(token) => {
              const target = document.activeElement?.id;
              if (target === "form-confirmation-email-subject") {
                insertIntoMetaField(
                  "confirmationEmailSubject",
                  token,
                  confirmationEmailSubject
                );
                return;
              }
              insertIntoMetaField(
                "confirmationEmailBodyMarkdown",
                token,
                confirmationEmailBodyMarkdown
              );
            }}
          />
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-warm">Subject</span>
          <input
            id="form-confirmation-email-subject"
            type="text"
            maxLength={200}
            value={confirmationEmailSubject ?? ""}
            disabled={isArchived || isSaving}
            placeholder={`You're registered — {{full_name}}`}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            onChange={(event) => {
              const next = event.target.value.trim() ? event.target.value : null;
              setDraftSchema((current) => ({
                ...current,
                meta: mergeFormSchemaMeta(current, { confirmationEmailSubject: next }),
              }));
            }}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-text-warm">Closing message</span>
          <textarea
            id="form-confirmation-email-body-markdown"
            rows={3}
            maxLength={2000}
            value={confirmationEmailBodyMarkdown ?? ""}
            disabled={isArchived || isSaving}
            placeholder="Save the date — we look forward to seeing you there, {{full_name}}."
            className="flex min-h-[4rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            onChange={(event) => {
              const next = event.target.value.trim() ? event.target.value : null;
              setDraftSchema((current) => ({
                ...current,
                meta: mergeFormSchemaMeta(current, {
                  confirmationEmailBodyMarkdown: next,
                }),
              }));
            }}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
        <div className="flex items-start gap-3">
          <input
            id="split-into-steps"
            type="checkbox"
            className="mt-1 size-4 rounded border-input"
            checked={Boolean(draftSchema.meta?.splitIntoSteps)}
            disabled={
              isArchived ||
              isSaving ||
              (stepsLocked && !draftSchema.meta?.splitIntoSteps)
            }
            onChange={(event) => {
              const enabled = event.target.checked;
              setDraftSchema((current) =>
                applyMissingStepBuckets({
                  ...current,
                  meta: mergeFormSchemaMeta(current, { splitIntoSteps: enabled }),
                })
              );
            }}
          />
          <div>
            <label htmlFor="split-into-steps" className="text-sm font-medium text-text-warm">
              Split into steps
            </label>
            <p className="mt-0.5 text-xs text-text-muted-warm">
              Pro only. Identity → Details → Consent. Off keeps the public Form on one
              page. Field count does not turn this on.
            </p>
            {stepsLocked ? (
              <p className="mt-2 text-xs text-text-muted-warm">
                Upgrade to Pro to split the Form into steps. Core can still use Recipes.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <FormFieldEditor
        schema={draftSchema}
        onChange={setDraftSchema}
        disabled={isArchived}
        className="min-w-0"
        recipesLocked={recipesLocked}
        corePlusLocked={corePlusLocked}
        stepsEnabled={Boolean(draftSchema.meta?.splitIntoSteps)}
        stepsLocked={stepsLocked}
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
        <div className="registration-preview-surface max-h-[min(36rem,70dvh)] overflow-y-auto overscroll-y-contain rounded-xl border border-border-warm bg-background p-4 [-webkit-overflow-scrolling:touch] sm:p-5">
          {introMarkdown ? (
            <RegistrationIntroCopy
              introMarkdown={introMarkdown}
              className="mb-4 space-y-3"
            />
          ) : null}
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
