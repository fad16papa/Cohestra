import { getPublicApiBaseUrl } from "@/lib/api";
import {
  PREVIEW_FAILURE_COPY,
  STALE_PREVIEW_COPY,
  type PlanChangeConfirmResult,
  type PlanChangePreview,
  type ProviderMoney,
} from "@/lib/billing/plan-change-review";

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
  billingConfigured: boolean;
  clientToken: string | null;
  trialPeriodDays: number;
  isComplimentary: boolean;
  usage: BillingUsage | null;
  coreLimits: BillingPlanLimits | null;
  proLimits: BillingPlanLimits | null;
  scheduledPlan: string | null;
  scheduledPlanEffectiveAt: string | null;
  scheduledBillingInterval: string | null;
  cancelAtPeriodEnd: boolean;
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

export const BILLING_RECONCILE_REASONS = {
  checkoutReturn: "checkout-return",
  explicitRefresh: "explicit-refresh",
} as const;

export type BillingReconcileReason =
  (typeof BILLING_RECONCILE_REASONS)[keyof typeof BILLING_RECONCILE_REASONS];

export const BILLING_UNAVAILABLE_COPY =
  "Billing isn't configured in this environment. Paddle isn't available here. You can keep working; plan status may be stale.";

export function shouldRequestBillingProviderSync(input: {
  billingConfigured: boolean;
  reason: BillingReconcileReason | null;
}): boolean {
  if (!input.billingConfigured) {
    return false;
  }

  return (
    input.reason === BILLING_RECONCILE_REASONS.checkoutReturn
    || input.reason === BILLING_RECONCILE_REASONS.explicitRefresh
  );
}

export function resolveCheckoutReturnTrigger(input: {
  billing: string | null;
  sessionId: string | null;
  ptxn: string | null;
  transactionId: string | null;
}): { shouldReconcile: boolean; checkoutSessionId: string | null } {
  const billingSuccess = input.billing === "success";
  const paddleReturnId = input.ptxn ?? input.transactionId;
  if (!billingSuccess && !paddleReturnId) {
    return { shouldReconcile: false, checkoutSessionId: null };
  }

  return {
    shouldReconcile: true,
    checkoutSessionId: input.sessionId ?? paddleReturnId,
  };
}

export function checkoutReconcileKey(
  tenantSlug: string,
  checkoutSessionId: string | null
): string {
  return `${tenantSlug}::${checkoutSessionId ?? "billing-success"}`;
}

export function createCheckoutReconcileGate() {
  let active: { key: string; promise: Promise<{ synced: boolean }> } | null = null;

  return {
    run(
      key: string,
      start: () => Promise<{ synced: boolean }>
    ): Promise<{ synced: boolean }> {
      if (active?.key === key) {
        return active.promise;
      }

      const promise = start().then(
        (result) => result,
        (error: unknown) => {
          if (active?.key === key) {
            active = null;
          }

          throw error;
        }
      );
      active = { key, promise };
      return promise;
    },
  };
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

export async function reconcileBillingFromProviderWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  options: {
    reason: BillingReconcileReason;
    checkoutSessionId?: string | null;
  }
): Promise<{ summary: BillingSummary; synced: boolean }> {
  const summary = await fetchBillingSummaryWithAuth(authFetch);
  if (
    !shouldRequestBillingProviderSync({
      billingConfigured: summary.billingConfigured,
      reason: options.reason,
    })
  ) {
    return { summary, synced: false };
  }

  const synced = await syncBillingFromProviderWithAuth(
    authFetch,
    options.checkoutSessionId
  );
  return { summary: synced, synced: true };
}

async function syncBillingFromProviderWithAuth(
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

export async function previewPlanChangeWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: { plan: "core" | "pro"; interval: "monthly" | "annual" }
): Promise<
  | { ok: true; result: PlanChangePreview }
  | { ok: false; message: string }
> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/billing/subscription/change-preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: payload.plan,
        interval: payload.interval,
      }),
    }
  );

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    return { ok: false, message: parseProblem(raw) || PREVIEW_FAILURE_COPY };
  }

  const preview = mapPlanChangePreview(raw);
  if (!preview) {
    return { ok: false, message: PREVIEW_FAILURE_COPY };
  }

  return { ok: true, result: preview };
}

export async function confirmPlanChangeWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: {
    plan: "core" | "pro";
    interval: "monthly" | "annual";
    previewState: string;
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<
  | { ok: true; result: PlanChangeConfirmResult }
  | { ok: false; conflict: boolean; message: string }
> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/billing/subscription/change`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: payload.plan,
        interval: payload.interval,
        previewState: payload.previewState,
        successUrl: payload.successUrl,
        cancelUrl: payload.cancelUrl,
      }),
    }
  );

  const raw = (await response.json()) as Record<string, unknown>;
  if (response.status === 409) {
    return { ok: false, conflict: true, message: parseProblem(raw) || STALE_PREVIEW_COPY };
  }

  if (!response.ok) {
    return { ok: false, conflict: false, message: parseProblem(raw) };
  }

  const result = mapPlanChangeConfirm(raw);
  if (!result) {
    return { ok: false, conflict: false, message: "Could not confirm this plan change." };
  }

  return { ok: true, result };
}

function parseMoney(raw: unknown): ProviderMoney | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const amount = record.amountMinor ?? record.AmountMinor;
  const currency = record.currency ?? record.Currency;
  if (typeof amount !== "number" || !Number.isInteger(amount) || typeof currency !== "string" || !currency.trim()) {
    return null;
  }

  return { amountMinor: amount, currency };
}

function mapPlanChangePreview(raw: Record<string, unknown>): PlanChangePreview | null {
  const currentPlan = raw.currentPlan ?? raw.CurrentPlan;
  const currentInterval = raw.currentInterval ?? raw.CurrentInterval;
  const targetPlan = raw.targetPlan ?? raw.TargetPlan;
  const targetInterval = raw.targetInterval ?? raw.TargetInterval;
  const previewState = raw.previewState ?? raw.PreviewState;
  const reviewCopy = raw.reviewCopy ?? raw.ReviewCopy;
  const confirmLabel = raw.confirmLabel ?? raw.ConfirmLabel;
  if (
    typeof currentPlan !== "string"
    || typeof currentInterval !== "string"
    || typeof targetPlan !== "string"
    || typeof targetInterval !== "string"
    || typeof previewState !== "string"
    || typeof reviewCopy !== "string"
    || typeof confirmLabel !== "string"
  ) {
    return null;
  }

  const currency = raw.currency ?? raw.Currency;
  const nextBilledAt = raw.nextBilledAt ?? raw.NextBilledAt;
  return {
    currentPlan,
    currentInterval,
    targetPlan,
    targetInterval,
    currency: typeof currency === "string" ? currency : null,
    credit: parseMoney(raw.credit ?? raw.Credit),
    dueNow: parseMoney(raw.dueNow ?? raw.DueNow),
    nextRecurringAmount: parseMoney(raw.nextRecurringAmount ?? raw.NextRecurringAmount),
    nextBilledAt: typeof nextBilledAt === "string" ? nextBilledAt : null,
    providerPreviewAvailable: Boolean(raw.providerPreviewAvailable ?? raw.ProviderPreviewAvailable),
    deferred: Boolean(raw.deferred ?? raw.Deferred),
    previewState,
    reviewCopy,
    confirmLabel,
  };
}

function mapPlanChangeConfirm(raw: Record<string, unknown>): PlanChangeConfirmResult | null {
  const successMessage = raw.successMessage ?? raw.SuccessMessage;
  const redirectUrl = raw.redirectUrl ?? raw.RedirectUrl;
  if (typeof successMessage !== "string" || typeof redirectUrl !== "string") {
    return null;
  }

  const currency = raw.currency ?? raw.Currency;
  const transactionId = raw.transactionId ?? raw.TransactionId;
  const invoiceReference = raw.invoiceReference ?? raw.InvoiceReference;
  const nextBilledAt = raw.nextBilledAt ?? raw.NextBilledAt;
  return {
    successMessage,
    redirectUrl,
    completedInApp: Boolean(raw.completedInApp ?? raw.CompletedInApp),
    amountCharged: parseMoney(raw.amountCharged ?? raw.AmountCharged),
    currency: typeof currency === "string" ? currency : null,
    transactionId: typeof transactionId === "string" ? transactionId : null,
    invoiceReference: typeof invoiceReference === "string" ? invoiceReference : null,
    nextBilledAt: typeof nextBilledAt === "string" ? nextBilledAt : null,
  };
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
    billingConfigured: Boolean(
      raw.billingConfigured ?? raw.BillingConfigured,
    ),
    clientToken:
      typeof (raw.clientToken ?? raw.ClientToken) === "string"
        ? String(raw.clientToken ?? raw.ClientToken)
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
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd ?? raw.CancelAtPeriodEnd),
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
