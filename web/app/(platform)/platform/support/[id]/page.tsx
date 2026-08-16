"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { PlatformCard } from "@/components/platform/platform-card";
import {
  getPlatformSupportIssue,
  platformSupportAttachmentUrl,
  PLATFORM_SUPPORT_STATUSES,
  updatePlatformSupportIssue,
  type PlatformSupportIssueDetail,
} from "@/lib/platform-api";

export default function PlatformSupportDetailPage() {
  const params = useParams<{ id: string }>();
  const issueId = params.id;
  const { authFetch } = useAuth();

  const [issue, setIssue] = useState<PlatformSupportIssueDetail | null>(null);
  const [status, setStatus] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadIssue = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const detail = await getPlatformSupportIssue(authFetch, issueId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setIssue(detail);
      setStatus(detail.status);
      setInternalNote(detail.internalNote ?? "");
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load support issue.");
      setIssue(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [authFetch, issueId]);

  useEffect(() => {
    setIssue(null);
    setError(null);
    setActionError(null);
    setLoading(true);
    busyRef.current = false;
    setBusy(false);
  }, [issueId]);

  useEffect(() => {
    void loadIssue();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadIssue]);

  async function handleSave() {
    if (busyRef.current || !issue) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setActionError(null);

    try {
      const updated = await updatePlatformSupportIssue(authFetch, issueId, {
        status: status !== issue.status ? status : undefined,
        internalNote,
      });
      setIssue(updated);
      setStatus(updated.status);
      setInternalNote(updated.internalNote ?? "");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--plat-stone)]">Loading issue…</p>;
  }

  if (error || !issue) {
    return (
      <div className="space-y-4">
        <Link
          href="/platform/support"
          className="text-sm text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
        >
          ← Back to inbox
        </Link>
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error ?? "Support issue not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/platform/support"
          className="text-sm text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
        >
          ← Back to inbox
        </Link>
        <h1
          className="mt-4 text-3xl tracking-tight text-[var(--plat-ink)]"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          {issue.issueNumber}
        </h1>
        <p className="mt-2 text-sm text-[var(--plat-stone)]">{issue.subject}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="space-y-6">
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--plat-ink-soft)]">
              {issue.description}
            </p>
          </PlatformCard>

          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
              Attachments
            </h2>
            {issue.attachments.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--plat-stone)]">No screenshots attached.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {issue.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                      onClick={async () => {
                        try {
                          const response = await authFetch(
                            platformSupportAttachmentUrl(issue.id, attachment.id)
                          );
                          if (!response.ok) {
                            throw new Error("Download failed.");
                          }
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const anchor = document.createElement("a");
                          anchor.href = url;
                          anchor.download = attachment.fileName;
                          anchor.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          setActionError("Could not download attachment.");
                        }
                      }}
                    >
                      {attachment.fileName}
                    </button>
                    <span className="ml-2 text-xs text-[var(--plat-stone)]">
                      {formatBytes(attachment.sizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PlatformCard>
        </div>

        <div className="space-y-6">
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
              Context
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[var(--plat-stone)]">Tenant</dt>
                <dd>
                  <Link
                    href={`/platform/tenants/${issue.tenantId}`}
                    className="font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                  >
                    {issue.tenantSlug}
                  </Link>
                  <span className="block text-[var(--plat-ink-soft)]">{issue.tenantName}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--plat-stone)]">Plan</dt>
                <dd className="text-[var(--plat-ink-soft)]">{issue.plan}</dd>
              </div>
              <div>
                <dt className="text-[var(--plat-stone)]">Operator</dt>
                <dd className="text-[var(--plat-ink-soft)]">
                  {issue.operatorDisplayName}
                  <span className="block">{issue.operatorEmail}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--plat-stone)]">Created</dt>
                <dd className="tabular-nums text-[var(--plat-ink-soft)]">
                  {formatDateTime(issue.createdAt)}
                </dd>
              </div>
              {issue.userAgent ? (
                <div>
                  <dt className="text-[var(--plat-stone)]">User agent</dt>
                  <dd className="break-all text-xs text-[var(--plat-ink-soft)]">{issue.userAgent}</dd>
                </div>
              ) : null}
            </dl>
          </PlatformCard>

          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
              Triage
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="support-status" className="text-sm text-[var(--plat-stone)]">
                  Status
                </label>
                <select
                  id="support-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
                >
                  {PLATFORM_SUPPORT_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="support-internal-note" className="text-sm text-[var(--plat-stone)]">
                  Internal note
                </label>
                <textarea
                  id="support-internal-note"
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  rows={5}
                  placeholder="Platform-only notes (not emailed to operator)"
                  className="mt-1 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
                />
              </div>
              {actionError ? (
                <p role="alert" className="text-sm text-[var(--plat-danger)]">
                  {actionError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="min-h-11 w-full rounded-[10px] bg-[var(--plat-lagoon)] px-4 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </PlatformCard>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatusLabel(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}
