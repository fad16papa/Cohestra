import { paddleEnvironment } from "@/lib/billing/paddle-checkout";

export const CHECKOUT_INCOMPLETE_COPY =
  "Checkout has not activated a paid plan yet. You can resume checkout or refresh billing status.";

export const CHECKOUT_INCOMPLETE_SANDBOX_COPY =
  "In this sandbox environment you can finish checkout with test card 4242 4242 4242 4242, any future expiry, and any CVC.";

export const PADDLE_RETURN_COLLECTING_COPY =
  "Enter your card in the Paddle window. You will not be charged during the trial.";

export const PADDLE_RETURN_COLLECTING_SANDBOX_COPY =
  "Enter your card in the Paddle window. Sandbox card 4242 4242 4242 4242 · any future expiry · any CVC. You will not be charged during the trial.";

export const PADDLE_RETURN_UNMATCHED_COPY =
  "We couldn't match this checkout to a workspace. Open Settings → Billing and refresh billing status.";

export function allowSandboxBillingCopy(clientToken: string | null | undefined): boolean {
  if (!clientToken || clientToken.trim() === "") {
    return false;
  }

  return paddleEnvironment(clientToken) === "sandbox";
}

export function formatTrialRemaining(
  trialEndsAt: string | null | undefined,
  nowMs = Date.now()
): string | null {
  if (!trialEndsAt) {
    return null;
  }

  const end = Date.parse(trialEndsAt);
  if (Number.isNaN(end)) {
    return null;
  }

  const days = Math.max(0, Math.ceil((end - nowMs) / 86_400_000));
  if (days === 1) {
    return "Trial — 1 day left";
  }

  return `Trial — ${days} days left`;
}

export type BillingStatusPresentation = {
  headline: string;
  detail: string | null;
  attention: "none" | "status" | "alert";
};

export function describeBillingStatus(status: string | null | undefined): BillingStatusPresentation {
  switch (status) {
    case "Trialing":
      return {
        headline: "Trialing",
        detail: "The trial is active. Paid billing starts when the trial ends unless you cancel.",
        attention: "status",
      };
    case "Active":
      return {
        headline: "Active",
        detail: null,
        attention: "none",
      };
    case "PastDue":
      return {
        headline: "Payment is past due.",
        detail: "Update the payment method to keep this workspace fully available.",
        attention: "alert",
      };
    case "OnHold":
      return {
        headline: "Billing is on hold.",
        detail: "This workspace is read-only until payment is restored.",
        attention: "alert",
      };
    case "Canceled":
      return {
        headline: "Subscription canceled",
        detail: "Access continues until the current period ends if a period end is scheduled.",
        attention: "status",
      };
    case "Free":
      return {
        headline: "No paid subscription",
        detail: null,
        attention: "none",
      };
    default:
      return {
        headline: status && status.trim() !== "" ? status : "Unknown",
        detail: null,
        attention: "none",
      };
  }
}

export function checkoutIncompleteCopy(clientToken: string | null | undefined): string {
  if (allowSandboxBillingCopy(clientToken)) {
    return `${CHECKOUT_INCOMPLETE_COPY} ${CHECKOUT_INCOMPLETE_SANDBOX_COPY}`;
  }

  return CHECKOUT_INCOMPLETE_COPY;
}

export function paddleReturnCollectingCopy(clientToken: string | null | undefined): string {
  return allowSandboxBillingCopy(clientToken)
    ? PADDLE_RETURN_COLLECTING_SANDBOX_COPY
    : PADDLE_RETURN_COLLECTING_COPY;
}
