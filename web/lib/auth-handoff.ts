import type { AuthSession } from "@/lib/auth-storage";

export function buildAuthHandoffUrl(
  tenantDashboardBase: string,
  session: AuthSession,
  path: string,
  query?: Record<string, string>
): string {
  const url = new URL(path, tenantDashboardBase);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const hash = new URLSearchParams({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: String(session.expiresAt),
  });
  url.hash = hash.toString();
  return url.toString();
}

export function consumeAuthHandoffFromHash(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawHash = window.location.hash.replace(/^#/, "");
  if (!rawHash) {
    return null;
  }

  const params = new URLSearchParams(rawHash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresAtRaw = params.get("expires_at");

  if (
    !accessToken
    || !refreshToken
    || !expiresAtRaw
    || Number.isNaN(Number(expiresAtRaw))
  ) {
    return null;
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  );

  return {
    accessToken,
    refreshToken,
    expiresAt: Number(expiresAtRaw),
  };
}
