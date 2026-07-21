"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import {
  archivePlatformTenant,
  getPlatformTenant,
  reactivatePlatformTenant,
  suspendPlatformTenant,
  type PlatformAuditEntry,
  type TenantResponse,
} from "@/lib/platform-api";

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const { authFetch } = useAuth();

  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [audits, setAudits] = useState<PlatformAuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const detail = await getPlatformTenant(authFetch, tenantId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setTenant(detail.tenant);
      setAudits(detail.recentAudits);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load tenant.");
      setTenant(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [authFetch, tenantId]);

  useEffect(() => {
    void reload();
    return () => {
      requestIdRef.current += 1;
    };
  }, [reload]);

  async function runAction(action: () => Promise<TenantResponse>) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await action();
      setTenant(updated);
      setShowSuspend(false);
      setSuspendReason("");
      try {
        await reload();
      } catch {
        // Keep POST response tenant if audit reload fails.
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--plat-stone)]">Loading tenant…</p>;
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error ?? "Tenant not found."}
        </p>
        <Link href="/platform" className="text-sm text-[var(--plat-lagoon)] underline-offset-4 hover:underline">
          Back to directory
        </Link>
      </div>
    );
  }

  const canSuspend = tenant.status === "Active";
  const canReactivate = tenant.status === "Suspended";
  const canArchive = tenant.status !== "Archived";

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/platform"
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--plat-stone)] hover:text-[var(--plat-ink)]"
        >
          Directory
        </Link>
        <h1
          className="mt-3 text-3xl tracking-tight"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          {tenant.slug}
        </h1>
        <p className="mt-2 text-sm text-[var(--plat-stone)]">
          {tenant.name} · created {formatDate(tenant.createdAt)}
        </p>
        <p className="mt-3 text-sm text-[var(--plat-ink-soft)]">
          <span className="text-[var(--plat-stone)]">Status</span> {tenant.status}
          <span className="mx-2 text-[var(--plat-line-strong)]">·</span>
          <span className="text-[var(--plat-stone)]">Plan</span> {tenant.plan}
          <span className="mx-2 text-[var(--plat-line-strong)]">·</span>
          <span className="text-[var(--plat-stone)]">Billing</span> {tenant.billingStatus}
        </p>
        <p className="mt-1 text-sm text-[var(--plat-ink-soft)]">
          <span className="text-[var(--plat-stone)]">Admin contact</span>{" "}
          {tenant.adminContactEmail ?? "—"}
        </p>
      </div>

      <section className="space-y-4">
        <h2
          className="text-lg tracking-tight"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          Lifecycle
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Suspend is break-glass for abuse, ToS, or support freeze — not for non-payment.
          BillingStatus is never changed by these actions.
        </p>

        {actionError ? (
          <p role="alert" className="text-sm text-[var(--plat-danger)]">
            {actionError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canSuspend ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowSuspend((open) => !open)}
              className="min-h-11 rounded-[10px] bg-[var(--plat-danger)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Suspend
            </button>
          ) : null}
          {canReactivate ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(() => reactivatePlatformTenant(authFetch, tenant.id))
              }
              className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-4 text-sm font-semibold text-[var(--plat-lagoon-fg)] disabled:opacity-50"
            >
              Reactivate
            </button>
          ) : null}
          {canArchive ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(`Archive tenant ${tenant.slug}? This is a soft archive.`)
                ) {
                  return;
                }
                void runAction(() => archivePlatformTenant(authFetch, tenant.id));
              }}
              className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-4 text-sm font-semibold text-[var(--plat-ink)] disabled:opacity-50"
            >
              Archive
            </button>
          ) : null}
        </div>

        {showSuspend ? (
          <div className="max-w-xl space-y-3 border-t border-[var(--plat-line)] pt-4">
            <div className="rounded-[10px] bg-[var(--plat-danger-bg)] px-3 py-2 text-sm text-[var(--plat-danger)]">
              For abuse, ToS, or support freeze only. Ordinary unpaid invoices use billing dials —
              do not Suspend as collections.
            </div>
            <label htmlFor="suspend-reason" className="block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--plat-stone)]">
              Reason (required for audit)
            </label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              placeholder="Confirmed ToS abuse after review…"
            />
            <button
              type="button"
              disabled={busy || suspendReason.trim().length === 0}
              onClick={() =>
                void runAction(() =>
                  suspendPlatformTenant(authFetch, tenant.id, suspendReason.trim())
                )
              }
              className="min-h-11 rounded-[10px] bg-[var(--plat-danger)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirm suspend
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2
          className="text-lg tracking-tight"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          Recent audit
        </h2>
        <div className="overflow-x-auto border-y border-[var(--plat-line)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--plat-line)] text-xs uppercase tracking-[0.06em] text-[var(--plat-stone)]">
                <th className="py-3 pr-4 font-semibold">When</th>
                <th className="py-3 pr-4 font-semibold">Action</th>
                <th className="py-3 pr-4 font-semibold">Actor</th>
                <th className="py-3 pr-4 font-semibold">Tenant</th>
                <th className="py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--plat-stone)]">
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                audits.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--plat-line)]/80">
                    <td className="py-3 pr-4 tabular-nums text-[var(--plat-stone)]">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-3 pr-4 font-medium">{entry.action}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--plat-ink-soft)]">
                      {shortId(entry.actorUserId)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--plat-ink-soft)]">
                      {shortId(entry.tenantId)}
                    </td>
                    <td className="py-3 text-[var(--plat-ink-soft)]">{entry.reason ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}
