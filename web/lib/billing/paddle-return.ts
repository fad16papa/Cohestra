import { resolveMarketingApexUrl } from "@/lib/publisher-website-url";
import { parseTenantSlugFromHostname } from "@/lib/tenant-host";

export const PADDLE_CHECKOUT_RETURN_PATH = "/billing/paddle-return";

export function isPaddleTransactionId(
  value: string | null | undefined
): value is string {
  if (!value || value.length < 8 || value.length > 64) {
    return false;
  }

  return /^txn_[a-zA-Z0-9]+$/.test(value);
}

/** Slug-free Paddle default payment link for this environment's marketing apex. */
export function buildPaddleCheckoutReturnUrl(
  origin: string,
  transactionId?: string
): string {
  const apex = resolveMarketingApexUrl(origin).replace(/\/$/, "");
  if (transactionId && isPaddleTransactionId(transactionId)) {
    return `${apex}${PADDLE_CHECKOUT_RETURN_PATH}?_ptxn=${encodeURIComponent(transactionId)}`;
  }

  return `${apex}${PADDLE_CHECKOUT_RETURN_PATH}`;
}

/**
 * Paddle appends `_ptxn` to the Default payment link after hosted/overlay checkout.
 * On marketing apex, send any leftover `_ptxn` landing (e.g. `/pricing`) to the return handler.
 * Tenant hosts keep `_ptxn` so dashboard billing sync can run in place.
 */
export function resolvePaddleApexReturnRedirectUrl(
  origin: string,
  pathname: string,
  ptxn: string | null
): string | null {
  if (!isPaddleTransactionId(ptxn) || pathname === PADDLE_CHECKOUT_RETURN_PATH) {
    return null;
  }

  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (parseTenantSlugFromHostname(hostname)) {
    return null;
  }

  return buildPaddleCheckoutReturnUrl(origin, ptxn);
}
