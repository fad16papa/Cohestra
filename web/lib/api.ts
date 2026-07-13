const DEFAULT_API_URL = "http://localhost:8080";
const FETCH_TIMEOUT_MS = 5000;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Browser-facing API base URL (from build-time / runtime public env). */
export function getPublicApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    const origin = normalizeBaseUrl(window.location.origin);
    if (configured) {
      try {
        const configuredHost = new URL(configured).hostname;
        if (
          isLocalhostHostname(configuredHost) &&
          !isLocalhostHostname(window.location.hostname)
        ) {
          // Deployed behind nginx but image was built with localhost — use same origin.
          return origin;
        }
        return normalizeBaseUrl(configured);
      } catch {
        return origin;
      }
    }
    return origin;
  }

  if (configured) {
    return normalizeBaseUrl(configured);
  }

  return DEFAULT_API_URL;
}

/** Server-side API base URL (Docker internal hostname or public fallback). */
export function getServerApiBaseUrl(): string {
  const configured =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

  return normalizeBaseUrl(configured);
}

export type SystemInfo = {
  name: string;
  apiVersion: string;
};

function parseSystemInfo(raw: Record<string, unknown>): SystemInfo {
  const name = raw.name ?? raw.Name;
  const apiVersion = raw.apiVersion ?? raw.ApiVersion;

  if (typeof name !== "string" || typeof apiVersion !== "string") {
    throw new Error("Invalid system info payload");
  }

  return { name, apiVersion };
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch(
    `${getServerApiBaseUrl()}/api/v1/system/info`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseSystemInfo(raw);
}
