import { fetchServerApi } from "@/lib/server-api-fetch";

import {
  parsePublicSitePayload,
  type PublicSitePayload,
} from "@/lib/public-site-api";

const FETCH_TIMEOUT_MS = 5000;

export async function fetchPublicSiteServer(): Promise<PublicSitePayload | null> {
  try {
    const response = await fetchServerApi("/api/v1/public/site", {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parsePublicSitePayload(raw);
  } catch {
    return null;
  }
}

export async function fetchPreviewSiteServer(
  token: string
): Promise<PublicSitePayload | null> {
  if (!token.trim()) {
    return null;
  }

  try {
    const response = await fetchServerApi(
      `/api/v1/public/site/preview?token=${encodeURIComponent(token.trim())}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parsePublicSitePayload(raw);
  } catch {
    return null;
  }
}
