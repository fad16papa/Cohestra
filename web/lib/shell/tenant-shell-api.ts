import { getPublicApiBaseUrl } from "@/lib/api";

export type LimitDial = {
  key: string;
  label: string;
  used: number;
  limit: number;
  percent: number;
  warn: boolean;
  blocked: boolean;
};

export type BillingBanner = {
  variant: string;
  title: string;
  message: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  adminOnlyCta: boolean;
};

export type TenantShell = {
  plan: string;
  billingStatus: string;
  billingInterval: string | null;
  trialEndsAt: string | null;
  isComplimentary: boolean;
  isTenantAdmin: boolean;
  limits: {
    seats: number;
    communities: number;
    publishedActivities: number;
    registrationsPerMonth: number;
  };
  usage: {
    seatsUsed: number;
    communities: number;
    publishedActivities: number;
    registrationsThisMonth: number;
  };
  limitDials: LimitDial[];
  billingBanner: BillingBanner | null;
};

function parseLimitDial(raw: Record<string, unknown>): LimitDial | null {
  const key = raw.key ?? raw.Key;
  const label = raw.label ?? raw.Label;
  const used = raw.used ?? raw.Used;
  const limit = raw.limit ?? raw.Limit;
  const percent = raw.percent ?? raw.Percent;

  if (typeof key !== "string" || typeof label !== "string") {
    return null;
  }

  return {
    key,
    label,
    used: typeof used === "number" ? used : 0,
    limit: typeof limit === "number" ? limit : 0,
    percent: typeof percent === "number" ? percent : 0,
    warn: Boolean(raw.warn ?? raw.Warn),
    blocked: Boolean(raw.blocked ?? raw.Blocked),
  };
}

function parseBillingBanner(raw: Record<string, unknown>): BillingBanner | null {
  const variant = raw.variant ?? raw.Variant;
  const title = raw.title ?? raw.Title;
  const message = raw.message ?? raw.Message;
  if (typeof variant !== "string" || typeof title !== "string" || typeof message !== "string") {
    return null;
  }

  const ctaLabel = raw.ctaLabel ?? raw.CtaLabel;
  const ctaHref = raw.ctaHref ?? raw.CtaHref;

  return {
    variant,
    title,
    message,
    ctaLabel: typeof ctaLabel === "string" ? ctaLabel : null,
    ctaHref: typeof ctaHref === "string" ? ctaHref : null,
    adminOnlyCta: Boolean(raw.adminOnlyCta ?? raw.AdminOnlyCta),
  };
}

export function parseTenantShell(raw: Record<string, unknown>): TenantShell {
  const limitsRaw = (raw.limits ?? raw.Limits ?? {}) as Record<string, unknown>;
  const usageRaw = (raw.usage ?? raw.Usage ?? {}) as Record<string, unknown>;
  const dialsRaw = raw.limitDials ?? raw.LimitDials;
  const bannerRaw = raw.billingBanner ?? raw.BillingBanner;

  const limitDials = Array.isArray(dialsRaw)
    ? dialsRaw
        .map((item) => parseLimitDial(item as Record<string, unknown>))
        .filter((item): item is LimitDial => item !== null)
    : [];

  const billingBanner =
    bannerRaw && typeof bannerRaw === "object"
      ? parseBillingBanner(bannerRaw as Record<string, unknown>)
      : null;

  return {
    plan: String(raw.plan ?? raw.Plan ?? "Basic"),
    billingStatus: String(raw.billingStatus ?? raw.BillingStatus ?? "Free"),
    billingInterval:
      typeof (raw.billingInterval ?? raw.BillingInterval) === "string"
        ? String(raw.billingInterval ?? raw.BillingInterval)
        : null,
    trialEndsAt:
      typeof (raw.trialEndsAt ?? raw.TrialEndsAt) === "string"
        ? String(raw.trialEndsAt ?? raw.TrialEndsAt)
        : null,
    isComplimentary: Boolean(raw.isComplimentary ?? raw.IsComplimentary),
    isTenantAdmin: Boolean(raw.isTenantAdmin ?? raw.IsTenantAdmin),
    limits: {
      seats: Number(limitsRaw.seats ?? limitsRaw.Seats ?? 1),
      communities: Number(limitsRaw.communities ?? limitsRaw.Communities ?? 1),
      publishedActivities: Number(limitsRaw.publishedActivities ?? limitsRaw.PublishedActivities ?? 3),
      registrationsPerMonth: Number(
        limitsRaw.registrationsPerMonth ?? limitsRaw.RegistrationsPerMonth ?? 150
      ),
    },
    usage: {
      seatsUsed: Number(usageRaw.seatsUsed ?? usageRaw.SeatsUsed ?? 0),
      communities: Number(usageRaw.communities ?? usageRaw.Communities ?? 0),
      publishedActivities: Number(usageRaw.publishedActivities ?? usageRaw.PublishedActivities ?? 0),
      registrationsThisMonth: Number(
        usageRaw.registrationsThisMonth ?? usageRaw.RegistrationsThisMonth ?? 0
      ),
    },
    limitDials,
    billingBanner,
  };
}

export async function fetchTenantShell(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<TenantShell> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/shell`);
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not load workspace shell.");
  }

  return parseTenantShell(raw);
}

export function isProPlan(plan: string): boolean {
  return plan === "Pro" || plan === "Enterprise";
}

export function isCoreOrAbove(plan: string): boolean {
  return plan === "Core" || isProPlan(plan);
}

export function isBasicPlan(plan: string): boolean {
  return plan === "Basic";
}
