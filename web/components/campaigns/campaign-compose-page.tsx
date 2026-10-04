"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";

import { EmailComposer, isEmailComposerEmpty } from "@/components/campaigns/email-composer";
import { EmailPreviewDialog } from "@/components/campaigns/email-preview-dialog";
import { SegmentPicker } from "@/components/campaigns/segment-picker";
import { CampaignRoomChrome } from "@/components/campaigns/campaign-room-gate";
import { EmailDeliveryChecklist } from "@/components/campaigns/email-delivery-checklist";
import { PageHeader } from "@/components/shared/page-header";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { useToast } from "@/components/ui/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchActivities, type Activity } from "@/lib/activities-api";
import {
  campaignFetchDenial,
  resolveCampaignRoomAccess,
} from "@/lib/campaign-room-access";
import { campaignResultSummary, isCampaignInFlight } from "@/lib/campaign-html";
import {
  CAMPAIGN_HTML_MAX_BYTES,
  CAMPAIGN_SUBJECT_MAX_LENGTH,
  createEmailTemplate,
  deleteEmailTemplate,
  fetchEmailTemplates,
  getHtmlByteSize,
  isComposeSegmentReady,
  isValidSegmentQuery,
  sendCampaign,
  sendTestCampaignEmail,
  updateEmailTemplate,
  type ClientSegmentPreview,
  type ClientSegmentQuery,
  type EmailTemplate,
  type SendCampaignResult,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

const CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const actionButtonClass = "min-h-12 min-w-11 px-4";

function parsePreselectedClientIds(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => CLIENT_ID_PATTERN.test(value));
}

function composeFingerprint(
  subject: string,
  body: string,
  segment: ClientSegmentQuery
): string {
  return JSON.stringify({
    subject: subject.trim(),
    body,
    community: segment.community ?? "",
    additional: [...(segment.additionalClientIds ?? [])].sort(),
    name: segment.name ?? "",
    nationality: segment.nationality ?? "",
    profession: segment.profession ?? "",
  });
}

export function CampaignComposePage() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const { shell, loading: shellLoading } = useTenantShell();
  const access = resolveCampaignRoomAccess(shell, shellLoading);
  const searchParams = useSearchParams();
  const preselectedClientIds = useMemo(
    () => parsePreselectedClientIds(searchParams.get("clientIds")),
    [searchParams]
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segment, setSegment] = useState<ClientSegmentQuery>(() => ({
    consentOnly: true,
    additionalClientIds: preselectedClientIds,
  }));
  const [segmentPreview, setSegmentPreview] = useState<ClientSegmentPreview | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p></p>");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendCampaignResult | null>(null);
  const [expandedFailures, setExpandedFailures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [planLocked, setPlanLocked] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const sendingRef = useRef(false);
  const initialFingerprint = useRef(
    composeFingerprint("", "<p></p>", {
      consentOnly: true,
      additionalClientIds: preselectedClientIds,
    })
  );

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? null;
  const dirty =
    composeFingerprint(subject, body, segment) !== initialFingerprint.current &&
    sendResult === null;

  const handlePreviewChange = useCallback((preview: ClientSegmentPreview | null) => {
    setSegmentPreview(preview);
  }, []);

  useEffect(() => {
    setSegment((current) => ({
      ...current,
      additionalClientIds:
        preselectedClientIds.length > 0 ? preselectedClientIds : undefined,
    }));
  }, [preselectedClientIds]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (access.kind !== "open") {
      return;
    }

    let cancelled = false;

    void Promise.all([
      fetchActivities(authFetch, { page: 1, pageSize: 100 }),
      fetchEmailTemplates(authFetch),
    ])
      .then(([activityResult, templateItems]) => {
        if (!cancelled) {
          setActivities(activityResult.items);
          setTemplates(templateItems);
          setDenied(false);
          setPlanLocked(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          const denial = campaignFetchDenial(loadError);
          setDenied(denial.denied);
          setPlanLocked(denial.planLocked);
          setError(denial.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [access.kind, authFetch]);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setTemplateName(template.name);
    setSubject(template.subject);
    setBody(
      template.bodyFormat === "html"
        ? template.body
        : template.body.includes("<")
          ? template.body
          : `<p>${template.body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`
    );
  }

  async function handleSaveTemplate() {
    if (!templateName.trim() || !subject.trim() || isEmailComposerEmpty(body)) {
      showToast("Template name, subject, and body are required.");
      return;
    }

    try {
      const created = await createEmailTemplate(authFetch, {
        name: templateName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        bodyFormat: "html",
      });
      setTemplates((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTemplateId(created.id);
      showToast("Template saved.");
    } catch (saveError) {
      showToast(
        saveError instanceof Error ? saveError.message : "Could not save template."
      );
    }
  }

  async function handleUpdateTemplate() {
    if (!selectedTemplateId || !selectedTemplate) {
      showToast("Select a template to update.");
      return;
    }

    if (!templateName.trim() || !subject.trim() || isEmailComposerEmpty(body)) {
      showToast("Template name, subject, and body are required.");
      return;
    }

    try {
      const updated = await updateEmailTemplate(authFetch, selectedTemplateId, {
        name: templateName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        bodyFormat: "html",
      });
      setTemplates((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Template updated.");
    } catch (updateError) {
      showToast(
        updateError instanceof Error ? updateError.message : "Could not update template."
      );
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      await deleteEmailTemplate(authFetch, templateId);
      setTemplates((current) => current.filter((item) => item.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId("");
        setTemplateName("");
      }
      showToast("Template deleted.");
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error ? deleteError.message : "Could not delete template."
      );
    }
  }

  async function handleSendTest() {
    if (testing || sending) {
      return;
    }

    if (!subject.trim() || isEmailComposerEmpty(body)) {
      showToast("Subject and message are required.");
      return;
    }

    if (getHtmlByteSize(body) > CAMPAIGN_HTML_MAX_BYTES) {
      showToast(`Message must be ${CAMPAIGN_HTML_MAX_BYTES / 1024}KB or smaller.`);
      return;
    }

    setTesting(true);
    try {
      const result = await sendTestCampaignEmail(authFetch, {
        subject: subject.trim(),
        body,
        bodyFormat: "html",
      });

      if (result.success) {
        showToast("Test email sent to your operator address.");
      } else {
        showToast(result.failureReason ?? "Test email failed.");
      }
    } catch (testError) {
      showToast(testError instanceof Error ? testError.message : "Test email failed.");
    } finally {
      setTesting(false);
    }
  }

  function requestSend() {
    if (sending || sendingRef.current) {
      return;
    }

    if (!subject.trim() || isEmailComposerEmpty(body)) {
      showToast("Subject and message are required.");
      return;
    }

    if (subject.trim().length > CAMPAIGN_SUBJECT_MAX_LENGTH) {
      showToast(`Subject must be ${CAMPAIGN_SUBJECT_MAX_LENGTH} characters or fewer.`);
      return;
    }

    if (getHtmlByteSize(body) > CAMPAIGN_HTML_MAX_BYTES) {
      showToast(`Message must be ${CAMPAIGN_HTML_MAX_BYTES / 1024}KB or smaller.`);
      return;
    }

    if (!isComposeSegmentReady(segment)) {
      showToast("Select a target community before sending.");
      return;
    }

    if (!isValidSegmentQuery(segment)) {
      showToast("Segment filters are invalid.");
      return;
    }

    if (!segmentPreview || segmentPreview.withEmailCount === 0) {
      showToast("No consented recipients with email addresses match this segment.");
      return;
    }

    setSendDialogOpen(true);
  }

  async function performSend() {
    if (sendingRef.current) {
      return;
    }

    if (!segmentPreview || segmentPreview.withEmailCount === 0) {
      return;
    }

    sendingRef.current = true;
    setSendDialogOpen(false);
    setSending(true);
    setSendResult(null);
    setError(null);

    try {
      const result = await sendCampaign(authFetch, {
        subject: subject.trim(),
        body,
        bodyFormat: "html",
        emailTemplateId: selectedTemplateId || undefined,
        segment,
      });
      setSendResult(result);
      showToast(
        isCampaignInFlight(result.status)
          ? "Campaign queued — delivery is still in progress."
          : campaignResultSummary(result)
      );
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Campaign send failed.";
      setError(message);
      showToast(message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const failedResults = sendResult?.results.filter((item) => item.status === "failed") ?? [];
  const skippedResults = sendResult?.results.filter((item) => item.status === "skipped") ?? [];

  function getSendBlockReason(): string | null {
    if (sending) {
      return "Sending… A second send is blocked until this request finishes.";
    }

    if (!subject.trim()) {
      return "Enter a subject before sending.";
    }

    if (!body.trim() || isEmailComposerEmpty(body)) {
      return "Enter a message before sending.";
    }

    if (getHtmlByteSize(body) > CAMPAIGN_HTML_MAX_BYTES) {
      return `Message must be ${CAMPAIGN_HTML_MAX_BYTES / 1024}KB or smaller.`;
    }

    if (!isComposeSegmentReady(segment)) {
      return "Select a target community before sending.";
    }

    if (!isValidSegmentQuery(segment)) {
      return "Segment filters are invalid.";
    }

    if (segmentPreview === null) {
      return "Waiting for recipient preview…";
    }

    if (segmentPreview.withEmailCount === 0) {
      if (segmentPreview.totalCount === 0) {
        return "No clients match this segment.";
      }

      if (segmentPreview.withoutConsentCount === segmentPreview.totalCount) {
        return "No recipients have recorded consent for email. Clients must opt in during registration.";
      }

      return "No matching clients have both consent and a valid email address.";
    }

    return null;
  }

  const sendBlockReason = getSendBlockReason();
  const canSend = sendBlockReason === null && !sending;
  const composeState = sending
    ? "Sending"
    : sendResult
      ? isCampaignInFlight(sendResult.status)
        ? "Delivery in progress"
        : sendResult.failedCount > 0
          ? "Partial or failed result"
          : "Completed"
      : sendDialogOpen
        ? "Confirmation open"
        : !canSend
          ? dirty
            ? "Unsaved draft — incomplete"
            : "Incomplete"
          : dirty
            ? "Unsaved draft — ready to send"
            : "Ready to send";

  return (
    <CampaignRoomChrome
      title="Compose campaign"
      description="Choose recipients, write your message, and send to consented leads with email on file."
      access={access}
      denied={denied}
      deniedMessage={error ?? undefined}
      planLockedOverride={planLocked}
      isTenantAdmin={shell?.isTenantAdmin === true}
    >
      <div className="space-y-6">
        <div>
          <PageHeader
            eyebrow={
              <Link
                href="/campaigns"
                className="inline-flex min-h-12 items-center text-sm font-medium normal-case tracking-normal text-text-muted-warm motion-press hover:text-text-warm"
              >
                ← Back to campaigns
              </Link>
            }
            title="Compose campaign"
            description="Choose recipients, write your message, and send to consented leads with email on file."
          />
        </div>

        <p role="status" className="text-sm text-text-muted-warm">
          {composeState}
          {dirty ? " Leaving this page discards the draft. Nothing is saved automatically." : null}
        </p>

        <EmailDeliveryChecklist />

        {error && !denied && !planLocked ? (
          <ProductErrorState
            title="Campaign compose could not finish"
            message={error}
          />
        ) : null}

        <SegmentPicker
          activities={activities}
          authFetch={authFetch}
          value={segment}
          onChange={setSegment}
          onPreviewChange={handlePreviewChange}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="min-w-0 space-y-4 rounded-xl border border-border-warm bg-card p-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-subject">Subject</Label>
              <Input
                id="campaign-subject"
                value={subject}
                maxLength={CAMPAIGN_SUBJECT_MAX_LENGTH}
                className="min-h-12"
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <EmailComposer
                authFetch={authFetch}
                activities={activities}
                value={body}
                onChange={setBody}
                communityFilter={segment.community}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionButtonClass}
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                className={actionButtonClass}
                disabled={testing || sending || !subject.trim() || isEmailComposerEmpty(body)}
                onClick={() => void handleSendTest()}
              >
                {testing ? "Sending test…" : "Send test to me"}
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                className={actionButtonClass}
                disabled={!canSend}
                onClick={requestSend}
              >
                {sending ? "Sending…" : "Send campaign"}
              </Button>
              {sendBlockReason ? (
                <p className="text-sm text-text-muted-warm" role="status">
                  {sendBlockReason}
                </p>
              ) : segmentPreview ? (
                <p className="text-sm text-text-muted-warm" role="status">
                  Ready to send to{" "}
                  <span className="font-medium text-text-warm">
                    {segmentPreview.withEmailCount}
                  </span>{" "}
                  consented client
                  {segmentPreview.withEmailCount === 1 ? "" : "s"} with email
                  {segmentPreview.additionalWithEmailCount > 0 ? (
                    <>
                      {" "}
                      (
                      {segmentPreview.communityWithEmailCount} from community +{" "}
                      {segmentPreview.additionalWithEmailCount} additional)
                    </>
                  ) : (
                    "."
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 space-y-4 rounded-xl border border-border-warm bg-card p-4">
            <div>
              <h2 className="text-sm font-semibold text-text-warm">Templates</h2>
              <p className="mt-1 text-sm text-text-muted-warm">
                Reuse saved subjects and bodies when composing campaigns.
              </p>
            </div>

            {templates.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="campaign-template">Load template</Label>
                <select
                  id="campaign-template"
                  value={selectedTemplateId}
                  onChange={(event) => applyTemplate(event.target.value)}
                  className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-text-muted-warm">No templates saved yet.</p>
            )}

            <div className="space-y-2 border-t border-border-warm pt-4">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                value={templateName}
                className="min-h-12"
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Template name"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={actionButtonClass}
                  onClick={() => void handleSaveTemplate()}
                >
                  Save as new
                </Button>
                {selectedTemplate ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={actionButtonClass}
                    onClick={() => void handleUpdateTemplate()}
                  >
                    Update selected
                  </Button>
                ) : null}
              </div>
            </div>

            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-warm px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="min-h-12 truncate text-left text-text-warm hover:underline"
                  onClick={() => applyTemplate(template.id)}
                >
                  {template.name}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  className={actionButtonClass}
                  onClick={() => void handleDeleteTemplate(template.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>

        {sendResult ? (
          <div className="rounded-xl border border-border-warm bg-card p-4">
            <h2 className="text-sm font-semibold text-text-warm">Send results</h2>
            <p className="mt-2 text-sm text-text-muted-warm" role="status">
              {campaignResultSummary(sendResult)}
            </p>
            {failedResults.length > 0 ? (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className={actionButtonClass}
                  onClick={() => setExpandedFailures((current) => !current)}
                >
                  {expandedFailures ? "Hide" : "Show"} failure details
                </Button>
                {expandedFailures ? (
                  <ul className="mt-3 space-y-2 text-sm text-text-muted-warm">
                    {failedResults.map((item) => (
                      <li key={item.clientId}>
                        <span className="font-medium text-text-warm">{item.fullName}</span>
                        {item.failureReason ? ` — ${item.failureReason}` : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {skippedResults.length > 0 ? (
              <p className="mt-3 text-sm text-text-muted-warm">
                {skippedResults.length} skipped without email or consent.
              </p>
            ) : null}
            <Link
              href={`/campaigns/${sendResult.campaignId}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                actionButtonClass,
                "mt-4 inline-flex"
              )}
            >
              View campaign details
            </Link>
          </div>
        ) : null}

        <EmailPreviewDialog
          open={previewOpen}
          subject={subject}
          html={body}
          recipientCount={segmentPreview?.withEmailCount ?? null}
          onClose={() => setPreviewOpen(false)}
        />

        <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-text-link">
                  <Send className="size-4" aria-hidden />
                </span>
                <div className="space-y-2">
                  <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {segmentPreview ? (
                      <>
                        This will email{" "}
                        <span className="font-medium text-text-warm">
                          {segmentPreview.withEmailCount}
                        </span>{" "}
                        consented client
                        {segmentPreview.withEmailCount === 1 ? "" : "s"} with email on file
                        {segmentPreview.additionalWithEmailCount > 0 ? (
                          <>
                            {" "}
                            ({segmentPreview.communityWithEmailCount} from{" "}
                            {segment.community ?? "community"} +{" "}
                            {segmentPreview.additionalWithEmailCount} outside community).
                          </>
                        ) : (
                          "."
                        )}{" "}
                        Sending cannot be undone.
                      </>
                    ) : (
                      "Confirm sending this campaign to the selected segment. Sending cannot be undone."
                    )}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className={actionButtonClass} disabled={sending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={actionButtonClass}
                disabled={sending}
                onClick={() => void performSend()}
              >
                {sending ? "Sending…" : "Send campaign"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CampaignRoomChrome>
  );
}
