"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, LifeBuoy, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import {
  createSupportIssue,
  fetchSupportIssues,
  type SupportIssueListItem,
} from "@/lib/support-api";

const textareaClassName =
  "min-h-[8rem] w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function formatStatus(status: string): string {
  switch (status) {
    case "InProgress":
      return "In progress";
    case "WaitingOnOperator":
      return "Waiting on you";
    default:
      return status.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}

function formatDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function HelpSupportSection() {
  const { authFetch, profile } = useAuth();
  const { showToast } = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successIssueNumber, setSuccessIssueNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentIssues, setRecentIssues] = useState<SupportIssueListItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  const loadRecent = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const items = await fetchSupportIssues(authFetch);
      setRecentIssues(items);
    } catch {
      setRecentIssues([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) {
      return;
    }

    const combined = [...files, ...selected].slice(0, MAX_FILES);
    for (const file of combined) {
      if (file.size > MAX_FILE_BYTES) {
        setError("Each screenshot must be 2MB or smaller.");
        return;
      }
    }

    setError(null);
    setFiles(combined);
    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessIssueNumber(null);
    setCopied(false);
    setIsSubmitting(true);

    try {
      const result = await createSupportIssue(authFetch, {
        subject,
        description,
        files,
      });
      setSuccessIssueNumber(result.issueNumber);
      setSubject("");
      setDescription("");
      setFiles([]);
      showToast("Support request submitted. You'll receive a confirmation email shortly.");
      await loadRecent();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit support request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyIssueNumber() {
    if (!successIssueNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(successIssueNumber);
      setCopied(true);
      showToast("Support ID copied.");
    } catch {
      showToast("Could not copy support ID.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-section text-text-warm">Help &amp; support</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Reach Creativorare with a subject, description, and optional screenshots.
          You&apos;ll get a support ID on screen and a confirmation email at{" "}
          {profile?.email ?? "your operator address"}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border-warm bg-muted/20 p-4 sm:p-5"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted-warm">
            Avoid guest phone numbers or other personal details in screenshots unless
            they are needed to explain the issue.
          </p>

          <div className="space-y-2">
            <Label htmlFor="supportSubject">Subject</Label>
            <Input
              id="supportSubject"
              required
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportDescription">Description</Label>
            <textarea
              id="supportDescription"
              required
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What happened, what you expected, and steps to reproduce."
              className={textareaClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportScreenshots">Screenshots (optional, max {MAX_FILES})</Label>
            <Input
              id="supportScreenshots"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={files.length >= MAX_FILES}
              onChange={handleFileChange}
            />
            {files.length > 0 ? (
              <ul className="space-y-1 text-sm text-text-muted-warm">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {successIssueNumber ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Support request submitted
              </p>
              <p className="mt-2 text-sm text-text-muted-warm">
                Save this ID for follow-up:
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="text-2xl font-semibold tracking-wide text-text-warm">
                  {successIssueNumber}
                </code>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyIssueNumber}>
                  {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? "Copied" : "Copy ID"}
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                <LifeBuoy className="size-4" aria-hidden />
                Submit support request
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-text-warm">Recent requests</h3>
          <p className="text-sm text-text-muted-warm">
            Your last 10 submissions in this workspace.
          </p>
        </div>

        {isLoadingRecent ? (
          <p className="text-sm text-text-muted-warm">Loading recent requests…</p>
        ) : recentIssues.length === 0 ? (
          <p className="text-sm text-text-muted-warm">No support requests yet.</p>
        ) : (
          <ul className="divide-y divide-border-warm rounded-xl border border-border-warm">
            {recentIssues.map((issue) => (
              <li key={issue.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-sm font-medium text-text-warm">{issue.issueNumber}</p>
                  <p className="truncate text-sm text-text-warm">{issue.subject}</p>
                  <p className="text-xs text-text-muted-warm">{formatDate(issue.createdAt)}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit shrink-0 items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-text-warm"
                  )}
                >
                  {formatStatus(issue.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
