import { getPublicApiBaseUrl } from "@/lib/api";

export type BillingUsage = {
  seatsUsed: number;
  communities: number;
  publishedActivities: number;
  registrationsThisMonth: number;
};

export type BillingPlanLimits = {
  seats: number;
  communities: number;
  publishedActivities: number;
  registrationsPerMonth: number;
};

export type BillingSummary = {
  plan: string;
  billingStatus: string;
  billingInterval: string | null;
  trialEndsAt: string | null;
  hasConsumedTrial: boolean;
  stripeConfigured: boolean;
  publishableKey: string | null;
  trialPeriodDays: number;
  isComplimentary: boolean;
  usage: BillingUsage | null;
  coreLimits: BillingPlanLimits | null;
  proLimits: BillingPlanLimits | null;
  scheduledPlan: string | null;
  scheduledPlanEffectiveAt: string | null;
  scheduledBillingInterval: string | null;
};

export type CheckoutSessionResult = {
  checkoutUrl: string;
  trialEndsAt: string | null;
  trialIncluded: boolean;
  trialDisclaimer: string;
  completedInApp: boolean;
  warnings: string[];
};

function parseProblem(raw: Record<string, unknown>): string {
  const detail = raw.detail ?? raw.Detail;
  const title = raw.title ?? raw.Title;
  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }

  if (typeof title === "string") {
    return title;
  }

  return "Request failed.";
}

export async function createBillingPortalSession(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  returnUrl?: string
): Promise<string> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnUrl: returnUrl ?? null }),
  });

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  const portalUrl = raw.portalUrl ?? raw.PortalUrl;
  if (typeof portalUrl !== "string") {
    throw new Error("Portal session did not return a URL.");
  }

  return portalUrl;
}

export async function fetchBillingSummaryWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<BillingSummary> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing`);
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  return mapBillingSummary(raw);
}

export async function syncBillingFromStripeWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  checkoutSessionId?: string | null
): Promise<BillingSummary> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/sync`, {
    method: "POST",
    headers: checkoutSessionId ? { "Content-Type": "application/json" } : undefined,
    body: checkoutSessionId
      ? JSON.stringify({ checkoutSessionId })
      : undefined,
  });
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  return mapBillingSummary(raw);
}

export async function createBillingCheckoutWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: {
    plan: "core" | "pro";
    interval: "monthly" | "annual";
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<
  | { ok: true; result: CheckoutSessionResult }
  | { ok: false; message: string }
> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan: payload.plan,
      interval: payload.interval,
      successUrl: payload.successUrl,
      cancelUrl: payload.cancelUrl,
    }),
  });

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    return { ok: false, message: parseProblem(raw) };
  }

  const checkoutUrl = raw.checkoutUrl ?? raw.CheckoutUrl;
  const trialDisclaimer = raw.trialDisclaimer ?? raw.TrialDisclaimer;
  if (typeof checkoutUrl !== "string" || typeof trialDisclaimer !== "string") {
    return { ok: false, message: "Invalid checkout response." };
  }

  return {
    ok: true,
    result: {
      checkoutUrl,
      trialEndsAt:
        typeof (raw.trialEndsAt ?? raw.TrialEndsAt) === "string"
          ? String(raw.trialEndsAt ?? raw.TrialEndsAt)
          : null,
      trialIncluded: Boolean(raw.trialIncluded ?? raw.TrialIncluded),
      trialDisclaimer,
      completedInApp: Boolean(raw.completedInApp ?? raw.CompletedInApp),
      warnings: parseStringArray(raw.warnings ?? raw.Warnings),
    },
  };
}

function parsePlanLimits(raw: unknown): BillingPlanLimits | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const seats = record.seats ?? record.Seats;
  const communities = record.communities ?? record.Communities;
  const publishedActivities = record.publishedActivities ?? record.PublishedActivities;
  const registrationsPerMonth = record.registrationsPerMonth ?? record.RegistrationsPerMonth;

  if (
    typeof seats !== "number"
    || typeof communities !== "number"
    || typeof publishedActivities !== "number"
    || typeof registrationsPerMonth !== "number"
  ) {
    return null;
  }

  return { seats, communities, publishedActivities, registrationsPerMonth };
}

function parseUsage(raw: unknown): BillingUsage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const seatsUsed = record.seatsUsed ?? record.SeatsUsed;
  const communities = record.communities ?? record.Communities;
  const publishedActivities = record.publishedActivities ?? record.PublishedActivities;
  const registrationsThisMonth = record.registrationsThisMonth ?? record.RegistrationsThisMonth;

  if (
    typeof seatsUsed !== "number"
    || typeof communities !== "number"
    || typeof publishedActivities !== "number"
    || typeof registrationsThisMonth !== "number"
  ) {
    return null;
  }

  return { seatsUsed, communities, publishedActivities, registrationsThisMonth };
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is string => typeof item === "string");
}

export function mapBillingSummary(raw: Record<string, unknown>): BillingSummary {
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
    hasConsumedTrial: Boolean(raw.hasConsumedTrial ?? raw.HasConsumedTrial),
    stripeConfigured: Boolean(raw.stripeConfigured ?? raw.StripeConfigured),
    publishableKey:
      typeof (raw.publishableKey ?? raw.PublishableKey) === "string"
        ? String(raw.publishableKey ?? raw.PublishableKey)
        : null,
    trialPeriodDays: Number(raw.trialPeriodDays ?? raw.TrialPeriodDays ?? 30),
    isComplimentary: Boolean(raw.isComplimentary ?? raw.IsComplimentary),
    usage: parseUsage(raw.usage ?? raw.Usage),
    coreLimits: parsePlanLimits(raw.coreLimits ?? raw.CoreLimits),
    proLimits: parsePlanLimits(raw.proLimits ?? raw.ProLimits),
    scheduledPlan:
      typeof (raw.scheduledPlan ?? raw.ScheduledPlan) === "string"
        ? String(raw.scheduledPlan ?? raw.ScheduledPlan)
        : null,
    scheduledPlanEffectiveAt:
      typeof (raw.scheduledPlanEffectiveAt ?? raw.ScheduledPlanEffectiveAt) === "string"
        ? String(raw.scheduledPlanEffectiveAt ?? raw.ScheduledPlanEffectiveAt)
        : null,
    scheduledBillingInterval:
      typeof (raw.scheduledBillingInterval ?? raw.ScheduledBillingInterval) === "string"
        ? String(raw.scheduledBillingInterval ?? raw.ScheduledBillingInterval)
        : null,
  };
}

export function formatTrialDisclaimer(trialPeriodDays: number): string {
  const trialEnd = new Date();
  trialEnd.setUTCDate(trialEnd.getUTCDate() + trialPeriodDays);
  return `You will not be charged while your trial is active. Billing starts on ${trialEnd.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} unless you cancel before then.`;
}
