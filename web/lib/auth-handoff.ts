import type { AuthSession } from "@/lib/auth-storage";
import { getPublicApiBaseUrl } from "@/lib/api";

export async function exchangeAuthHandoff(code: string): Promise<AuthSession | null> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/handoff/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    return null;
  }

  const accessToken = raw.accessToken ?? raw.AccessToken;
  const refreshToken = raw.refreshToken ?? raw.RefreshToken;
  const expiresInSeconds = raw.expiresInSeconds ?? raw.ExpiresInSeconds;

  if (
    typeof accessToken !== "string"
    || typeof refreshToken !== "string"
    || typeof expiresInSeconds !== "number"
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}

export function buildCheckoutHandoffUrl(
  tenantDashboardBase: string,
  handoffCode: string,
  query?: Record<string, string>
): string {
  const url = new URL("/billing/checkout", tenantDashboardBase);
  url.searchParams.set("handoff", handoffCode);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
