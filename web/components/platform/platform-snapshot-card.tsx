"use client";

import Link from "next/link";

import { PlatformCard } from "@/components/platform/platform-card";
import type { PlatformTenantSnapshot } from "@/lib/platform-api";

type PlatformSnapshotCardProps = {
  snapshot: PlatformTenantSnapshot | null;
  loading?: boolean;
  error?: string | null;
  tenantHref?: string;
};

export function PlatformSnapshotCard({
  snapshot,
  loading = false,
  error = null,
  tenantHref,
}: PlatformSnapshotCardProps) {
  if (loading) {
    return (
      <PlatformCard className="p-5">
        <p className="text-sm text-[var(--plat-stone)]">Loading snapshot…</p>
      </PlatformCard>
    );
  }

  if (error) {
    return (
      <PlatformCard className="p-5">
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error}
        </p>
      </PlatformCard>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <PlatformCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
          Tenant snapshot
        </h2>
        {snapshot.isDemoOrLoadTest ? (
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            Demo / load-test
          </span>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Plan" value={snapshot.plan} />
        <Row label="Status" value={snapshot.status} />
        <Row label="Billing" value={snapshot.billingStatus} />
        {snapshot.isComplimentary ? <Row label="Complimentary" value="Yes" /> : null}
        <MeterRow label="Seats" meter={snapshot.seats} />
        <MeterRow label="Communities" meter={snapshot.communities} />
        <MeterRow label="Published activities" meter={snapshot.publishedActivities} />
        <MeterRow label="Registrations (month)" meter={snapshot.registrationsThisMonth} />
        <Row
          label="Last activity"
          value={
            snapshot.lastActivityAt
              ? new Date(snapshot.lastActivityAt).toLocaleString()
              : "—"
          }
        />
        <Row label="Open issues" value={String(snapshot.openIssueCount)} />
      </dl>

      {snapshot.members.length > 0 ? (
        <div className="mt-4 border-t border-[var(--plat-line)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
            Members
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--plat-ink-soft)]">
            {snapshot.members.slice(0, 6).map((member) => (
              <li key={`${member.email}-${member.role}`}>
                {member.email}
                <span className="ml-2 text-xs text-[var(--plat-stone)]">({member.role})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tenantHref ? (
        <Link
          href={tenantHref}
          className="mt-4 inline-block text-sm font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
        >
          Open tenant detail
        </Link>
      ) : null}
    </PlatformCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--plat-stone)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--plat-ink-soft)]">{value}</dd>
    </div>
  );
}

function MeterRow({
  label,
  meter,
}: {
  label: string;
  meter: { used: number; max: number };
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--plat-stone)]">{label}</dt>
      <dd className="tabular-nums text-[var(--plat-ink-soft)]">
        {meter.used}/{meter.max}
      </dd>
    </div>
  );
}
