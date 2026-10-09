import type { PlatformOpsHealth } from "@/lib/platform-api";
import {
  failingHealthChecks,
  healthStatusLabel,
  shouldShowDegradedBanner,
} from "@/lib/platform-health";

type PlatformDirectoryHealthBannerProps = {
  health: PlatformOpsHealth | null;
  unavailable: boolean;
};

export function PlatformDirectoryHealthBanner({
  health,
  unavailable,
}: PlatformDirectoryHealthBannerProps) {
  if (unavailable) {
    return (
      <div
        role="status"
        className="rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-4 py-4"
      >
        <h2 className="text-sm font-semibold text-[var(--plat-ink)]">
          Infrastructure health is unavailable
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--plat-ink)]">
          The authenticated health request could not produce data. Tenant search, filters, and
          create still work. This does not mean PostgreSQL, Redis, or other dependencies are
          unhealthy — the diagnostic itself failed.
        </p>
      </div>
    );
  }

  if (!health || !shouldShowDegradedBanner(health.overallStatus)) {
    return null;
  }

  const failed = failingHealthChecks(health.checks);
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-4"
    >
      <h2 className="text-sm font-semibold text-[var(--plat-danger)]">
        Infrastructure health is {healthStatusLabel(health.overallStatus)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--plat-ink)]">
        {failed.length === 0
          ? "Authenticated postgres, redis, or default-tenant checks are not Healthy."
          : failed
              .map((check) => `${check.name} is ${healthStatusLabel(check.status)}`)
              .join(". ") + "."}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--plat-ink)]">
        Anonymous <code className="font-mono text-[0.95em]">/ready</code> only checks postgres,
        redis, and default-tenant. It does not cover everything operational: outbox, Paddle, and
        email are not proven healthy by this probe.
      </p>
    </div>
  );
}
