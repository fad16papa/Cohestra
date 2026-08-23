import { getPublicApiBaseUrl } from "@/lib/api";

import type { BillingSummary } from "@/lib/billing/billing-api";
import { mapBillingSummary } from "@/lib/billing/billing-api";

export type BillingContact = {
  name: string;
  email: string;
  phone: string | null;
};

export type BillingPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type BillingSubscriptionDetails = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  scheduledPlan: string | null;
  scheduledPlanEffectiveAt: string | null;
};

export type BillingInvoice = {
  id: string;
  createdAt: string;
  amountDueCents: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedInvoiceUrl: string | null;
};

export type BillingDetails = {
  summary: BillingSummary;
  contact: BillingContact | null;
  paymentMethod: BillingPaymentMethod | null;
  subscription: BillingSubscriptionDetails | null;
  invoices: BillingInvoice[];
};

export type SetupIntentResult = {
  clientSecret: string;
  clientToken: string;
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

function mapContact(raw: Record<string, unknown>): BillingContact {
  const phoneRaw = raw.phone ?? raw.Phone;
  return {
    name: String(raw.name ?? raw.Name ?? ""),
    email: String(raw.email ?? raw.Email ?? ""),
    phone: typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : null,
  };
}

function mapPaymentMethod(raw: Record<string, unknown>): BillingPaymentMethod {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    brand: String(raw.brand ?? raw.Brand ?? "card"),
    last4: String(raw.last4 ?? raw.Last4 ?? "????"),
    expMonth: Number(raw.expMonth ?? raw.ExpMonth ?? 0),
    expYear: Number(raw.expYear ?? raw.ExpYear ?? 0),
  };
}

function mapSubscription(raw: Record<string, unknown>): BillingSubscriptionDetails {
  return {
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd ?? raw.CancelAtPeriodEnd),
    currentPeriodEnd:
      typeof (raw.currentPeriodEnd ?? raw.CurrentPeriodEnd) === "string"
        ? String(raw.currentPeriodEnd ?? raw.CurrentPeriodEnd)
        : null,
    scheduledPlan:
      typeof (raw.scheduledPlan ?? raw.ScheduledPlan) === "string"
        ? String(raw.scheduledPlan ?? raw.ScheduledPlan)
        : null,
    scheduledPlanEffectiveAt:
      typeof (raw.scheduledPlanEffectiveAt ?? raw.ScheduledPlanEffectiveAt) === "string"
        ? String(raw.scheduledPlanEffectiveAt ?? raw.ScheduledPlanEffectiveAt)
        : null,
  };
}

function mapInvoice(raw: Record<string, unknown>): BillingInvoice {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ""),
    amountDueCents: Number(raw.amountDueCents ?? raw.AmountDueCents ?? 0),
    currency: String(raw.currency ?? raw.Currency ?? "usd"),
    status: String(raw.status ?? raw.Status ?? "unknown"),
    pdfUrl:
      typeof (raw.pdfUrl ?? raw.PdfUrl) === "string"
        ? String(raw.pdfUrl ?? raw.PdfUrl)
        : null,
    hostedInvoiceUrl:
      typeof (raw.hostedInvoiceUrl ?? raw.HostedInvoiceUrl) === "string"
        ? String(raw.hostedInvoiceUrl ?? raw.HostedInvoiceUrl)
        : null,
  };
}

function mapBillingDetails(raw: Record<string, unknown>): BillingDetails {
  const summaryRaw = (raw.summary ?? raw.Summary ?? {}) as Record<string, unknown>;
  const contactRaw = raw.contact ?? raw.Contact;
  const paymentMethodRaw = raw.paymentMethod ?? raw.PaymentMethod;
  const subscriptionRaw = raw.subscription ?? raw.Subscription;
  const invoicesRaw = (raw.invoices ?? raw.Invoices ?? []) as Record<string, unknown>[];

  return {
    summary: mapBillingSummary(summaryRaw),
    contact:
      contactRaw && typeof contactRaw === "object"
        ? mapContact(contactRaw as Record<string, unknown>)
        : null,
    paymentMethod:
      paymentMethodRaw && typeof paymentMethodRaw === "object"
        ? mapPaymentMethod(paymentMethodRaw as Record<string, unknown>)
        : null,
    subscription:
      subscriptionRaw && typeof subscriptionRaw === "object"
        ? mapSubscription(subscriptionRaw as Record<string, unknown>)
        : null,
    invoices: invoicesRaw.map((invoice) => mapInvoice(invoice)),
  };
}

export async function fetchBillingDetailsWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<BillingDetails> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/details`);
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  return mapBillingDetails(raw);
}

export async function createPaymentMethodSetupWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SetupIntentResult> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/payment-method/setup`, {
    method: "POST",
  });
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw));
  }

  const clientSecret = raw.clientSecret ?? raw.ClientSecret;
  const clientToken = raw.clientToken ?? raw.ClientToken ?? raw.publishableKey ?? raw.PublishableKey;
  if (typeof clientSecret !== "string" || typeof clientToken !== "string") {
    throw new Error("Invalid payment method setup response.");
  }

  return { clientSecret, clientToken };
}

export async function confirmPaymentMethodSetupWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  setupIntentId: string
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/billing/payment-method/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId }),
    }
  );

  if (response.status === 204) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  throw new Error(parseProblem(raw));
}

export async function updateBillingContactWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  payload: { name?: string; email?: string; phoneCountry?: string; phoneLocal?: string }
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/contact`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phoneCountry: payload.phoneCountry,
      phoneLocal: payload.phoneLocal,
    }),
  });

  if (response.status === 204) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  throw new Error(parseProblem(raw));
}

export async function cancelSubscriptionWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/subscription/cancel`, {
    method: "POST",
  });

  if (response.status === 204) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  throw new Error(parseProblem(raw));
}

export async function resumeSubscriptionWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/billing/subscription/resume`, {
    method: "POST",
  });

  if (response.status === 204) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  throw new Error(parseProblem(raw));
}

export async function cancelScheduledPlanChangeWithAuth(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/billing/subscription/cancel-scheduled-change`,
    { method: "POST" }
  );

  if (response.status === 204) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  throw new Error(parseProblem(raw));
}

export function formatInvoiceAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function formatCardBrand(brand: string): string {
  if (!brand) {
    return "Card";
  }

  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
