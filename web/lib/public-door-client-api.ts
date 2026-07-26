import { getPublicApiBaseUrl } from "@/lib/api";
import {
  EMPTY_PUBLIC_DOOR,
  parseDoorPayload,
  type PublicDoorPayload,
} from "@/lib/public-door-payload";

export async function fetchPublicDoorClient(): Promise<PublicDoorPayload> {
  try {
    const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/door`, {
      cache: "no-store",
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
