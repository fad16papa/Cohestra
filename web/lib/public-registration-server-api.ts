import { fetchServerApi } from "@/lib/server-api-fetch";
import {
  parsePublicActivity,
  type PublicActivityFetchResult,
} from "@/lib/public-registration-api";

export async function fetchPublicActivityBySlugServer(
  slug: string
): Promise<PublicActivityFetchResult> {
  try {
    const response = await fetchServerApi(
      `/api/v1/public/activities/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );

    if (response.status === 404) {
      return { kind: "not-found" };
    }

    if (!response.ok) {
      return { kind: "error" };
    }

    const activity = parsePublicActivity(
      (await response.json()) as Record<string, unknown>
    );
    return { kind: "ok", activity };
  } catch {
    return { kind: "error" };
  }
}
