import {
  hasActivePaidSubscription,
  isDeferredPlanChange,
  isSamePlanAndInterval,
  normalizePlanId,
  type BillingIntervalId,
  type PaidPlanId,
} from "@/lib/billing/checkout-validation";

export const PREVIEW_FAILURE_COPY =
  "We couldn't retrieve Paddle's billing review. Try again before confirming this change.";

export const STALE_PREVIEW_COPY =
  "Your billing state changed while you were reviewing this change. Review the updated billing details and try again.";

export const REVIEW_DIALOG_CLASS_NAME =
  "max-h-[min(90dvh,40rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto sm:w-full";

export type ProviderMoney = {
  amountMinor: number;
  currency: string;
};

export type PlanChangePreview = {
  currentPlan: string;
  currentInterval: string;
  targetPlan: string;
  targetInterval: string;
  currency: string | null;
  credit: ProviderMoney | null;
  dueNow: ProviderMoney | null;
  nextRecurringAmount: ProviderMoney | null;
  nextBilledAt: string | null;
  providerPreviewAvailable: boolean;
  deferred: boolean;
  previewState: string;
  reviewCopy: string;
  confirmLabel: string;
};

export type PlanChangeConfirmResult = {
  successMessage: string;
  redirectUrl: string;
  completedInApp: boolean;
  amountCharged: ProviderMoney | null;
  currency: string | null;
  transactionId: string | null;
  invoiceReference: string | null;
  nextBilledAt: string | null;
};

export function requiresProviderPreview(input: {
  billingStatus: string;
  currentPlan: string;
  targetPlan: PaidPlanId;
  currentInterval: string | null | undefined;
  targetInterval: BillingIntervalId;
}): boolean {
  if (input.billingStatus === "PastDue") {
    return false;
  }

  if (!hasActivePaidSubscription(input.billingStatus)) {
    return false;
  }

  if (!normalizePlanId(input.currentPlan)) {
    return false;
  }

  if (isSamePlanAndInterval(input.currentPlan, input.currentInterval, input.targetPlan, input.targetInterval)) {
    return false;
  }

  return !isDeferredPlanChange(
    input.currentPlan,
    input.currentInterval,
    input.targetPlan,
    input.targetInterval
  );
}

export function currencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.trim().toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function formatProviderMoney(amountMinor: number, currency: string): string {
  const code = currency.trim().toUpperCase() || "USD";
  const digits = currencyFractionDigits(code);
  const sign = amountMinor < 0 ? "-" : "";
  const abs = amountMinor < 0 ? -amountMinor : amountMinor;
  if (digits <= 0) {
    return `${sign}${abs} ${code}`;
  }

  let factor = 1;
  for (let i = 0; i < digits; i += 1) {
    factor *= 10;
  }

  const whole = Math.trunc(abs / factor);
  const fraction = abs % factor;
  return `${sign}${whole}.${String(fraction).padStart(digits, "0")} ${code}`;
}

export function providerMoneyAriaLabel(label: string, amountMinor: number, currency: string): string {
  return `${label} ${formatProviderMoney(amountMinor, currency)}`;
}

export function formatPreviewDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function visiblePreviewLines(preview: PlanChangePreview): Array<{
  label: string;
  value: string;
  ariaLabel: string;
}> {
  const lines: Array<{ label: string; value: string; ariaLabel: string }> = [];
  if (preview.credit) {
    const value = formatProviderMoney(preview.credit.amountMinor, preview.credit.currency);
    lines.push({
      label: "Credit",
      value,
      ariaLabel: providerMoneyAriaLabel("Credit", preview.credit.amountMinor, preview.credit.currency),
    });
  }

  if (preview.dueNow) {
    const value = formatProviderMoney(preview.dueNow.amountMinor, preview.dueNow.currency);
    lines.push({
      label: "Due now",
      value,
      ariaLabel: providerMoneyAriaLabel("Due now", preview.dueNow.amountMinor, preview.dueNow.currency),
    });
  }

  if (preview.nextBilledAt) {
    const value = formatPreviewDate(preview.nextBilledAt);
    lines.push({
      label: "Next renewal",
      value,
      ariaLabel: `Next renewal ${value}`,
    });
  }

  if (preview.nextRecurringAmount) {
    const value = formatProviderMoney(
      preview.nextRecurringAmount.amountMinor,
      preview.nextRecurringAmount.currency
    );
    lines.push({
      label: "New recurring amount",
      value,
      ariaLabel: providerMoneyAriaLabel(
        "New recurring amount",
        preview.nextRecurringAmount.amountMinor,
        preview.nextRecurringAmount.currency
      ),
    });
  }

  return lines;
}

export function canConfirmImmediatePreview(preview: PlanChangePreview | null, previewError: string | null): boolean {
  return Boolean(preview && preview.providerPreviewAvailable && !preview.deferred && !previewError);
}

export function successShowsAmount(result: PlanChangeConfirmResult): boolean {
  return result.amountCharged !== null;
}
