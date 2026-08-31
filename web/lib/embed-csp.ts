import { getServerApiBaseUrl } from "./api";
import { buildEmbedContentSecurityPolicy } from "../content-security-policy";

const EMBED_PATH_PREFIX = "/embed/";

/** Server-side API base for middleware embed-origins fetch (Docker `API_URL` or public fallback). */
export function resolveMiddlewareApiBaseUrl(): string {
  return getServerApiBaseUrl();
}

export async function fetchPublicEmbedOrigins(request: Request): Promise<string[]> {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const apiBase = resolveMiddlewareApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/v1/public/embed-origins`, {
      cache: "no-store",
      headers: host ? { "X-Forwarded-Host": host } : undefined,
    });

    if (!response.ok) {
      return [];
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const originsRaw = raw.allowedEmbedOrigins ?? raw.AllowedEmbedOrigins;
    if (!Array.isArray(originsRaw)) {
      return [];
    }

    return originsRaw.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function isEmbedPath(pathname: string): boolean {
  return pathname.startsWith(EMBED_PATH_PREFIX);
}

export function buildEmbedRouteSecurityHeaders(origins: readonly string[]): HeadersInit {
  return {
    "Content-Security-Policy": buildEmbedContentSecurityPolicy(origins),
  };
}
