"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";

import { EmailComposer, isEmailComposerEmpty } from "@/components/campaigns/email-composer";
import { EmailPreviewDialog } from "@/components/campaigns/email-preview-dialog";
import { SegmentPicker } from "@/components/campaigns/segment-picker";
import { EmailDeliveryChecklist } from "@/components/campaigns/email-delivery-checklist";
import { useAuth } from "@/components/auth/auth-provider";
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

export function CampaignComposePage() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segment, setSegment] = useState<ClientSegmentQuery>({ consentOnly: true });
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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? null;

  const handlePreviewChange = useCallback((preview: ClientSegmentPreview | null) => {
    setSegmentPreview(preview);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetchActivities(authFetch, { page: 1, pageSize: 100 }),
      fetchEmailTemplates(authFetch),
    ])
      .then(([activityResult, templateItems]) => {
        if (!cancelled) {
          setActivities(activityResult.items);
          setTemplates(templateItems);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load campaign compose data."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

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
    if (!segmentPreview || segmentPreview.withEmailCount === 0) {
      return;
    }

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
      showToast(`${result.sentCount} sent, ${result.failedCount} failed.`);
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Campaign send failed.";
      setError(message);
      showToast(message);
    } finally {
      setSending(false);
    }
  }

  const failedResults = sendResult?.results.filter((item) => item.status === "failed") ?? [];

  function getSendBlockReason(): string | null {
    if (sending) {
      return null;
    }

    if (!subject.trim()) {
      return "Enter a subject before sending.";
    }

    if (!body.trim()) {
      return "Enter a message before sending.";
    }

    if (isEmailComposerEmpty(body)) {
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
  const canSend = sendBlockReason === null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="text-sm text-text-muted-warm transition-colors hover:text-text-warm"
        >
          ← Back to campaigns
        </Link>
        <h2 className="mt-3 text-display-sm text-text-warm">Compose campaign</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Choose recipients, write your message, and send to consented leads with
          email on file.
        </p>
      </div>

      <EmailDeliveryChecklist />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <SegmentPicker
        activities={activities}
        authFetch={authFetch}
        value={segment}
        onChange={setSegment}
        onPreviewChange={handlePreviewChange}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-subject">Subject</Label>
            <Input
              id="campaign-subject"
              value={subject}
              maxLength={CAMPAIGN_SUBJECT_MAX_LENGTH}
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
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={testing || !subject.trim() || isEmailComposerEmpty(body)}
              onClick={() => void handleSendTest()}
            >
              {testing ? "Sending test…" : "Send test to me"}
            </Button>
          </div>

          <div className="space-y-2">
            <Button type="button" disabled={!canSend} onClick={requestSend}>
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

        <div className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
          <div>
            <h3 className="text-sm font-semibold text-text-warm">Templates</h3>
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
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleSaveTemplate()}>
                Save as new
              </Button>
              {selectedTemplate ? (
                <Button type="button" variant="outline" onClick={() => void handleUpdateTemplate()}>
                  Update selected
                </Button>
              ) : null}
            </div>
          </div>

          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border-warm px-3 py-2 text-sm"
            >
              <button
                type="button"
                className="truncate text-left text-text-warm hover:underline"
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
              </button>
              <Button
                type="button"
                size="sm"
                variant="outline"
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
          <h3 className="text-sm font-semibold text-text-warm">Send results</h3>
          <p className="mt-2 text-sm text-text-muted-warm">
            {sendResult.sentCount} sent, {sendResult.failedCount} failed
            {sendResult.skippedCount > 0
              ? ` (${sendResult.skippedCount} skipped without email)`
              : ""}
            .
          </p>
          {failedResults.length > 0 ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
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
          <Link
            href={`/campaigns/${sendResult.campaignId}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}
          >
            View campaign details
          </Link>
        </div>
      ) : null}

      <EmailPreviewDialog
        open={previewOpen}
        subject={subject}
        html={body}
        onClose={() => setPreviewOpen(false)}
      />

      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                      )}
                    </>
                  ) : (
                    "Confirm sending this campaign to the selected segment."
                  )}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sending} onClick={() => void performSend()}>
              {sending ? "Sending…" : "Send campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
