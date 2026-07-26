import { getPublicApiBaseUrl } from "@/lib/api";
import {
  EMPTY_PUBLIC_DOOR,
  parseDoorPayload,
  type PublicDoorPayload,
} from "@/lib/public-door-payload";

export async function fetchPublicDoorClient(): Promise<PublicDoorPayload> {
  try {
    const headers: HeadersInit = {};
    if (typeof window !== "undefined") {
      headers["X-Forwarded-Host"] = window.location.host;
    }

    const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/door`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      return EMPTY_PUBLIC_DOOR;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parseDoorPayload(raw);
  } catch {
    return EMPTY_PUBLIC_DOOR;
  }
}
