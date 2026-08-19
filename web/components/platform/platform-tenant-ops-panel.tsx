"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PlatformCard } from "@/components/platform/platform-card";
import { PlatformSnapshotCard } from "@/components/platform/platform-snapshot-card";
import {
  getPlatformTenantSnapshot,
  listPlatformTenantMembers,
  listPlatformTenantOpenIssues,
  resendPlatformEmailVerification,
  sendPlatformPasswordReset,
  type PlatformTenantMember,
  type PlatformTenantOpenIssue,
  type PlatformTenantSnapshot,
} from "@/lib/platform-api";

type PlatformTenantOpsPanelProps = {
  tenantId: string;
  adminContactEmail: string | null;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  onActionMessage?: (message: string | null) => void;
  onRefreshAudits?: () => void;
};

export function PlatformTenantOpsPanel({
  tenantId,
  adminContactEmail,
  authFetch,
  onActionMessage,
  onRefreshAudits,
}: PlatformTenantOpsPanelProps) {
  const [snapshot, setSnapshot] = useState<PlatformTenantSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [members, setMembers] = useState<PlatformTenantMember[]>([]);
  const [openIssues, setOpenIssues] = useState<PlatformTenantOpenIssue[]>([]);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const [snap, memberRows, issues] = await Promise.all([
        getPlatformTenantSnapshot(authFetch, tenantId),
        listPlatformTenantMembers(authFetch, tenantId),
        listPlatformTenantOpenIssues(authFetch, tenantId),
      ]);
      setSnapshot(snap);
      setMembers(memberRows);
      setOpenIssues(issues);
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : "Could not load snapshot.");
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, [authFetch, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runRecovery(
    memberUserId: string,
    action: "reset" | "verify"
  ) {
    const confirmed = window.confirm(
      action === "reset"
        ? "Send a password reset email to this member? This action is audited."
        : "Resend email verification to this member? This action is audited."
    );
    if (!confirmed) {
      return;
    }

    setBusyMemberId(memberUserId);
    onActionMessage?.(null);
    try {
      const message =
        action === "reset"
          ? await sendPlatformPasswordReset(authFetch, tenantId, memberUserId)
          : await resendPlatformEmailVerification(authFetch, tenantId, memberUserId);
      onActionMessage?.(message);
      onRefreshAudits?.();
      await load();
    } catch (err) {
      onActionMessage?.(
        err instanceof Error ? err.message : "Recovery action failed."
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PlatformSnapshotCard
        snapshot={snapshot}
        loading={snapshotLoading}
        error={snapshotError}
      />

      {adminContactEmail ? (
        <PlatformCard className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
            Admin contact
          </h2>
          <a
            href={`mailto:${adminContactEmail}`}
            className="mt-3 inline-block text-sm font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
          >
            {adminContactEmail}
          </a>
        </PlatformCard>
      ) : null}

      <PlatformCard className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
          Open support issues
        </h2>
        {openIssues.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--plat-stone)]">No open issues.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {openIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/platform/support/${issue.id}`}
                  className="text-sm font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                >
                  {issue.issueNumber}
                </Link>
                <span className="ml-2 text-sm text-[var(--plat-ink-soft)]">{issue.subject}</span>
              </li>
            ))}
          </ul>
        )}
      </PlatformCard>

      <PlatformCard className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
          Members & recovery
        </h2>
        {members.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--plat-stone)]">No members yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-col gap-2 border-b border-[var(--plat-line)]/80 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium text-[var(--plat-ink-soft)]">{member.email}</p>
                  <p className="text-xs text-[var(--plat-stone)]">
                    {member.role}
                    {member.emailVerified ? " · verified" : " · unverified"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyMemberId === member.userId}
                    onClick={() => void runRecovery(member.userId, "reset")}
                    className="min-h-9 rounded-[10px] border border-[var(--plat-line-strong)] px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    Send password reset
                  </button>
                  <button
                    type="button"
                    disabled={busyMemberId === member.userId || member.emailVerified}
                    title={member.emailVerified ? "Already verified" : undefined}
                    onClick={() => void runRecovery(member.userId, "verify")}
                    className="min-h-9 rounded-[10px] border border-[var(--plat-line-strong)] px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    Resend verification
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PlatformCard>
    </div>
  );
}
