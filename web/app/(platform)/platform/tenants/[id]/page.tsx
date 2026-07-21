"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import {
  archivePlatformTenant,
  getPlatformTenant,
  reactivatePlatformTenant,
  setPlatformTenantComplimentary,
  suspendPlatformTenant,
  type PlatformAuditEntry,
  type TenantResponse,
} from "@/lib/platform-api";

const COMPLIMENTARY_PLANS = ["Basic", "Core", "Pro"] as const;
/** Platform 0 default tenant — complimentary mutations are rejected server-side (409). */
const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const COMP_REASON_MAX = 1000;

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
  const [compPlan, setCompPlan] = useState<string>("Core");
  const [compReason, setCompReason] = useState("");
  const busyRef = useRef(false);
  const requestIdRef = useRef(0);
  const tenantIdRef = useRef(tenantId);
  tenantIdRef.current = tenantId;

  const loadDetail = useCallback(
    async (options?: { clearTenantOnError?: boolean }) => {
      const clearTenantOnError = options?.clearTenantOnError ?? true;
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
        if (COMPLIMENTARY_PLANS.includes(detail.tenant.plan as (typeof COMPLIMENTARY_PLANS)[number])) {
          setCompPlan(detail.tenant.plan);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (clearTenantOnError) {
          setError(err instanceof Error ? err.message : "Could not load tenant.");
          setTenant(null);
        } else {
          setActionError(
            err instanceof Error
              ? `Updated, but could not refresh audits: ${err.message}`
              : "Updated, but could not refresh audits."
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [authFetch, tenantId]
  );

  useEffect(() => {
    setTenant(null);
    setAudits([]);
    setError(null);
    setLoading(true);
    setCompReason("");
    setCompPlan("Core");
    setActionError(null);
    setSuspendReason("");
    setShowSuspend(false);
    busyRef.current = false;
    setBusy(false);
  }, [tenantId]);

  useEffect(() => {
    void loadDetail();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadDetail]);

  async function runAction(action: () => Promise<TenantResponse>) {
    if (busyRef.current) {
      return;
    }
    const actionTenantId = tenantIdRef.current;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await action();
      if (updated.id !== tenantIdRef.current || actionTenantId !== tenantIdRef.current) {
        return;
      }
      setTenant(updated);
      setShowSuspend(false);
      setSuspendReason("");
      await loadDetail({ clearTenantOnError: false });
    } catch (err) {
      if (actionTenantId !== tenantIdRef.current) {
        return;
      }
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      if (actionTenantId === tenantIdRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
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
  const isDefaultTenant =
    tenant.id === DEFAULT_TENANT_ID || tenant.slug === "default";
  const canChangeComplimentary = tenant.status !== "Archived" && !isDefaultTenant;

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
          {tenant.isComplimentary ? (
            <>
              <span className="mx-2 text-[var(--plat-line-strong)]">·</span>
              <span className="font-semibold text-[var(--plat-lagoon)]">Sponsored</span>
            </>
          ) : null}
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
          Complimentary
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Mark a pilot Sponsored without Stripe. Sets BillingStatus to Free. Clearing the flag does
          not start Checkout — paid entitlements require Checkout (FR-19) afterward.
        </p>

        {tenant.isComplimentary ? (
          <p className="text-sm text-[var(--plat-ink-soft)]">
            Currently <span className="font-semibold text-[var(--plat-lagoon)]">Sponsored</span> on{" "}
            {tenant.plan}.
          </p>
        ) : (
          <p className="text-sm text-[var(--plat-ink-soft)]">Not complimentary.</p>
        )}

        {canChangeComplimentary ? (
          <div className="max-w-xl space-y-3 border-t border-[var(--plat-line)] pt-4">
            <label
              htmlFor="comp-plan"
              className="block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--plat-stone)]"
            >
              Plan
            </label>
            <select
              id="comp-plan"
              value={compPlan}
              onChange={(event) => setCompPlan(event.target.value)}
              disabled={busy}
              className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
            >
              {COMPLIMENTARY_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
            <label
              htmlFor="comp-reason"
              className="block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--plat-stone)]"
            >
              Reason (optional)
            </label>
            <input
              id="comp-reason"
              value={compReason}
              onChange={(event) => setCompReason(event.target.value)}
              disabled={busy}
              maxLength={COMP_REASON_MAX}
              className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              placeholder="Pilot cohort Q3…"
            />
            <div className="flex flex-wrap gap-3">
              {!tenant.isComplimentary ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const updated = await setPlatformTenantComplimentary(authFetch, tenant.id, {
                        isComplimentary: true,
                        plan: compPlan,
                        reason: compReason.trim() || undefined,
                      });
                      setCompReason("");
                      return updated;
                    })
                  }
                  className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-4 text-sm font-semibold text-[var(--plat-lagoon-fg)] disabled:opacity-50"
                >
                  Set complimentary
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || compPlan === tenant.plan}
                    onClick={() =>
                      void runAction(async () => {
                        const updated = await setPlatformTenantComplimentary(authFetch, tenant.id, {
                          isComplimentary: true,
                          plan: compPlan,
                          reason: compReason.trim() || undefined,
                        });
                        setCompReason("");
                        return updated;
                      })
                    }
                    className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-4 text-sm font-semibold text-[var(--plat-lagoon-fg)] disabled:opacity-50"
                  >
                    Update plan
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        const updated = await setPlatformTenantComplimentary(authFetch, tenant.id, {
                          isComplimentary: false,
                          reason: compReason.trim() || undefined,
                        });
                        setCompReason("");
                        return updated;
                      })
                    }
                    className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-4 text-sm font-semibold text-[var(--plat-ink)] disabled:opacity-50"
                  >
                    Clear complimentary
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--plat-stone)]">
            {isDefaultTenant
              ? "Complimentary cannot be changed on the Platform 0 default tenant."
              : "Complimentary cannot be changed on an Archived tenant."}
          </p>
        )}
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
