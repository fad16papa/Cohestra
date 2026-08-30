"use client";

import { useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { FormFieldEditor } from "@/components/activities/form-field-editor";
import { ActivityCloseAtPicker } from "@/components/activities/activity-close-at-picker";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  cloneFormSchema,
  cloneFormTemplate,
  getFormTemplate,
  type FormTemplateId,
} from "@/lib/form-templates";
import {
  createFormTemplate,
  deleteFormTemplate,
  fetchFormTemplate,
  fetchFormTemplates,
  updateFormTemplate,
  type FormTemplateUsage,
  type SavedFormTemplate,
  type SavedFormTemplateSummary,
} from "@/lib/form-templates-api";
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
  const [pendingSavedTemplate, setPendingSavedTemplate] =
    useState<SavedFormTemplate | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedFormTemplateSummary[]>([]);
  const [templateUsage, setTemplateUsage] = useState<FormTemplateUsage>({
    used: 0,
    limit: 1,
  });
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTemplate, setRenameTemplate] = useState<SavedFormTemplateSummary | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<SavedFormTemplateSummary | null>(
    null
  );
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replaceTemplate, setReplaceTemplate] = useState<SavedFormTemplateSummary | null>(
    null
  );
  const [templateActionLoading, setTemplateActionLoading] = useState(false);

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
  const closedMessage = draftSchema.meta?.closedMessage ?? null;
  const registrationClosesAt = draftSchema.meta?.registrationClosesAt ?? null;
  const registrationTimeZoneId = shell?.registrationTimeZoneId ?? "UTC";
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

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setTemplatesLoading(true);
      try {
        const result = await fetchFormTemplates(authFetch);
        if (!cancelled) {
          setSavedTemplates(result.templates);
          setTemplateUsage(result.usage);
        }
      } catch {
        if (!cancelled) {
          setSavedTemplates([]);
          setTemplateUsage({ used: 0, limit: 1 });
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  function schemaForTemplateSave(): ActivityFormSchema {
    return applyMissingStepBuckets(draftSchema);
  }

  async function refreshSavedTemplates(): Promise<boolean> {
    try {
      const result = await fetchFormTemplates(authFetch);
      setSavedTemplates(result.templates);
      setTemplateUsage(result.usage);
      return true;
    } catch {
      return false;
    }
  }

  function ensureDraftReadyForTemplateLibrary(): boolean {
    if (hasClientIssues) {
      setError("Fix form validation issues before saving or replacing a template.");
      return false;
    }

    return true;
  }

  function applyLaunchTemplate(templateId: FormTemplateId) {
    setError(null);
    setSuccess(null);
    setDraftSchema(cloneFormTemplate(templateId));
    setSuccess(`${getFormTemplate(templateId).name} template applied. Save when ready.`);
  }

  function applySavedTemplate(template: SavedFormTemplate) {
    setError(null);
    setSuccess(null);
    setDraftSchema(cloneFormSchema(template.formSchema));
    setSuccess(`"${template.name}" applied. Save when ready.`);
  }

  function handleSelectTemplate(templateId: FormTemplateId) {
    if (isPublished || isArchived) {
      return;
    }

    setPendingTemplateId(templateId);
  }

  function confirmApplyTemplate() {
    if (pendingTemplateId) {
      applyLaunchTemplate(pendingTemplateId);
      setPendingTemplateId(null);
      return;
    }

    if (pendingSavedTemplate) {
      applySavedTemplate(pendingSavedTemplate);
      setPendingSavedTemplate(null);
    }
  }

  async function handleSelectSavedTemplate(template: SavedFormTemplateSummary) {
    if (isPublished || isArchived) {
      return;
    }

    setTemplateActionLoading(true);
    try {
      const full = await fetchFormTemplate(authFetch, template.id);
      setPendingSavedTemplate(full);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load saved template."
      );
    } finally {
      setTemplateActionLoading(false);
    }
  }

  async function handleSaveTemplate() {
    const trimmed = saveTemplateName.trim();
    if (!trimmed || !ensureDraftReadyForTemplateLibrary()) {
      return;
    }

    setTemplateActionLoading(true);
    setError(null);
    try {
      await createFormTemplate(authFetch, trimmed, schemaForTemplateSave());
      const refreshed = await refreshSavedTemplates();
      setSaveDialogOpen(false);
      setSaveTemplateName("");
      setSuccess(
        refreshed
          ? `Saved "${trimmed}" as a form template.`
          : `Saved "${trimmed}" as a form template. Refresh the page to update your library.`
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save template."
      );
    } finally {
      setTemplateActionLoading(false);
    }
  }

  async function handleReplaceTemplate() {
    if (!replaceTemplate || !ensureDraftReadyForTemplateLibrary()) {
      return;
    }

    setTemplateActionLoading(true);
    setError(null);
    try {
      await updateFormTemplate(authFetch, replaceTemplate.id, {
        formSchema: schemaForTemplateSave(),
      });
      const refreshed = await refreshSavedTemplates();
      setReplaceDialogOpen(false);
      setReplaceTemplate(null);
      setSuccess(
        refreshed
          ? `Replaced "${replaceTemplate.name}" with the current draft.`
          : `Replaced "${replaceTemplate.name}" with the current draft. Refresh the page to update your library.`
      );
    } catch (replaceError) {
      setError(
        replaceError instanceof Error ? replaceError.message : "Could not replace template."
      );
    } finally {
      setTemplateActionLoading(false);
    }
  }

  async function handleRenameTemplate() {
    if (!renameTemplate) {
      return;
    }

    const trimmed = renameValue.trim();
    if (!trimmed) {
      return;
    }

    setTemplateActionLoading(true);
    setError(null);
    try {
      await updateFormTemplate(authFetch, renameTemplate.id, { name: trimmed });
      const refreshed = await refreshSavedTemplates();
      setRenameDialogOpen(false);
      setRenameTemplate(null);
      setRenameValue("");
      setSuccess(
        refreshed
          ? `Renamed template to "${trimmed}".`
          : `Renamed template to "${trimmed}". Refresh the page to update your library.`
      );
    } catch (renameError) {
      setError(
        renameError instanceof Error ? renameError.message : "Could not rename template."
      );
    } finally {
      setTemplateActionLoading(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplate) {
      return;
    }

    setTemplateActionLoading(true);
    setError(null);
    try {
      await deleteFormTemplate(authFetch, deleteTemplate.id);
      const refreshed = await refreshSavedTemplates();
      setDeleteDialogOpen(false);
      setDeleteTemplate(null);
      setSuccess(
        refreshed
          ? "Template deleted."
          : "Template deleted. Refresh the page to update your library."
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete template."
      );
    } finally {
      setTemplateActionLoading(false);
    }
  }

  const pendingLaunchTemplate = pendingTemplateId
    ? getFormTemplate(pendingTemplateId)
    : null;
  const applyDialogOpen = pendingTemplateId !== null || pendingSavedTemplate !== null;
  const pendingApplyName =
    pendingLaunchTemplate?.name ?? pendingSavedTemplate?.name ?? "this template";

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
          onSelectSavedTemplate={(template) => void handleSelectSavedTemplate(template)}
          onSaveCurrentDraft={() => {
            if (!ensureDraftReadyForTemplateLibrary()) {
              return;
            }

            setSaveTemplateName("");
            setSaveDialogOpen(true);
          }}
          onRenameSavedTemplate={(template) => {
            setRenameTemplate(template);
            setRenameValue(template.name);
            setRenameDialogOpen(true);
          }}
          onReplaceSavedTemplate={(template) => {
            if (!ensureDraftReadyForTemplateLibrary()) {
              return;
            }

            setReplaceTemplate(template);
            setReplaceDialogOpen(true);
          }}
          onDeleteSavedTemplate={(template) => {
            setDeleteTemplate(template);
            setDeleteDialogOpen(true);
          }}
          savedTemplates={savedTemplates}
          usage={templateUsage}
          plan={plan}
          isTenantAdmin={shell?.isTenantAdmin ?? false}
          disabled={isSaving || templateActionLoading}
          locked={isPublished}
          lockedReason={isPublished ? publishedTemplateLockReason : undefined}
          templatesLoading={templatesLoading}
          hasClientIssues={hasClientIssues}
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
        <div>
          <h3 className="text-section text-text-warm">Closed message</h3>
          <p className="mt-0.5 text-sm text-text-muted-warm">
            Optional copy when the form is unavailable (full, paused, or ended). A reason chip
            still shows for clarity.
          </p>
        </div>
        <textarea
          id="form-closed-message"
          rows={4}
          maxLength={2000}
          value={closedMessage ?? ""}
          disabled={isArchived || isSaving}
          placeholder="Waitlist opens Monday on WhatsApp."
          className="flex min-h-[5rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          onChange={(event) => {
            const next = event.target.value.trim() ? event.target.value : null;
            setDraftSchema((current) => ({
              ...current,
              meta: mergeFormSchemaMeta(current, { closedMessage: next }),
            }));
          }}
        />
        <p className="text-xs text-text-muted-warm">
          Plain text and paragraph breaks only. HTML is stripped on the public page.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4">
        <div>
          <h3 className="text-section text-text-warm">Close-at</h3>
          <p className="mt-0.5 text-sm text-text-muted-warm">
            Optional date and time when the public form stops accepting registrations.
            Shown in your organization timezone.
          </p>
        </div>
        <ActivityCloseAtPicker
          isoUtc={registrationClosesAt}
          timeZoneId={registrationTimeZoneId}
          disabled={isArchived || isSaving}
          onChange={(nextUtc) =>
            setDraftSchema((current) => ({
              ...current,
              meta: mergeFormSchemaMeta(current, { registrationClosesAt: nextUtc }),
            }))
          }
        />
        {registrationClosesAt ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isArchived || isSaving}
            onClick={() =>
              setDraftSchema((current) => ({
                ...current,
                meta: mergeFormSchemaMeta(current, { registrationClosesAt: null }),
              }))
            }
          >
            Clear Close-at
          </Button>
        ) : null}
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
        </div>
        <label className="block space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-text-warm">Subject</span>
            <PipingCheatsheet
              schema={draftSchema}
              disabled={isArchived || isSaving}
              onInsert={(token) =>
                insertIntoMetaField("confirmationEmailSubject", token, confirmationEmailSubject)
              }
            />
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-text-warm">Closing message</span>
            <PipingCheatsheet
              schema={draftSchema}
              disabled={isArchived || isSaving}
              onInsert={(token) =>
                insertIntoMetaField(
                  "confirmationEmailBodyMarkdown",
                  token,
                  confirmationEmailBodyMarkdown
                )
              }
            />
          </div>
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
        open={applyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTemplateId(null);
            setPendingSavedTemplate(null);
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
                <AlertDialogTitle>Apply &quot;{pendingApplyName}&quot;?</AlertDialogTitle>
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

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save form template</DialogTitle>
            <DialogDescription>
              Save the current draft fields and meta as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-warm">Template name</span>
            <input
              type="text"
              maxLength={120}
              value={saveTemplateName}
              disabled={templateActionLoading}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              placeholder="Saturday tennis"
              onChange={(event) => setSaveTemplateName(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={templateActionLoading}
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={templateActionLoading || !saveTemplateName.trim()}
              onClick={() => void handleSaveTemplate()}
            >
              {templateActionLoading ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-warm">Template name</span>
            <input
              type="text"
              maxLength={120}
              value={renameValue}
              disabled={templateActionLoading}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={templateActionLoading}
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={templateActionLoading || !renameValue.trim()}
              onClick={() => void handleRenameTemplate()}
            >
              {templateActionLoading ? "Saving…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace &quot;{replaceTemplate?.name ?? "template"}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This overwrites the saved template with your current draft fields and meta.
              The template name stays the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleReplaceTemplate()}>
              Replace template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleteTemplate?.name ?? "template"}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved template. Activities already using these fields are
              not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteTemplate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
