import { headers } from "next/headers";

import { getServerApiBaseUrl } from "@/lib/api";

/** Read the incoming request Host for tenant resolution on server-side API calls. */
export async function getIncomingRequestHost(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-host") ?? headerStore.get("host");
}

export function buildTenantHostHeaders(host: string | null): HeadersInit {
  if (!host?.trim()) {
    return {};
  }

  return { Host: host.trim() };
}

export async function fetchServerApi(
  path: string,
  init?: RequestInit & { revalidate?: number | false }
): Promise<Response> {
  const host = await getIncomingRequestHost();
  const url = `${getServerApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const nextInit =
    init?.revalidate === undefined
      ? init
      : {
          ...init,
          next: { revalidate: init.revalidate },
        };

  return fetch(url, {
    ...nextInit,
    headers: {
      ...buildTenantHostHeaders(host),
      ...(init?.headers ?? {}),
    },
  });
}

export function isMarketingApexHost(host: string | null): boolean {
  if (!host) {
    return false;
  }

  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  if (normalized === "cohestra.app" || normalized === "www.cohestra.app") {
    return true;
  }

  if (normalized.endsWith(".cohestra.app")) {
    const label = normalized.slice(0, -".cohestra.app".length);
    return label === "" || label === "www";
  }

  return false;
}

export function isTenantSubdomainHost(host: string | null): boolean {
  if (!host) {
    return false;
  }

  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  if (normalized.endsWith(".localhost") && normalized !== "localhost") {
    return true;
  }

  if (normalized.endsWith(".cohestra.app") && !isMarketingApexHost(host)) {
    return true;
  }

  return false;
}
