import { getPublicApiBaseUrl } from "@/lib/api";

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
};

export type CheckoutSessionResult = {
  checkoutUrl: string;
  trialEndsAt: string | null;
  trialIncluded: boolean;
  trialDisclaimer: string;
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
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<BillingSummary> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/sync`, {
    method: "POST",
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
    },
  };
}

function mapBillingSummary(raw: Record<string, unknown>): BillingSummary {
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
