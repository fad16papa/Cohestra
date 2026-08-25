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

/**
 * Paddle upgrades http success URLs to https. Local Docker nginx on 8088 has no TLS,
 * so passing `http://localhost:8088/...` (or `{slug}.localhost`) produces ERR_SSL_PROTOCOL_ERROR.
 * Omit overlay successUrl on local HTTP and navigate in `checkout.completed` instead.
 */
export function sanitizePaddleOverlaySuccessUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isLoopback =
      host === "localhost"
      || host === "127.0.0.1"
      || host.endsWith(".localhost");
    if (isLoopback && parsed.protocol === "http:") {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
}
