import { cache } from "react";

import { fetchServerApi } from "@/lib/server-api-fetch";
import {
  EMPTY_PUBLIC_DOOR,
  parseDoorPayload,
  type PublicDoorKind,
  type PublicDoorPayload,
} from "@/lib/public-door-payload";

export type { PublicDoorKind, PublicDoorPayload };

export const fetchPublicDoorServer = cache(async (): Promise<PublicDoorPayload> => {
  try {
    const response = await fetchServerApi("/api/v1/public/door", { cache: "no-store" });
    if (!response.ok) {
      return EMPTY_PUBLIC_DOOR;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parseDoorPayload(raw);
  } catch {
    return EMPTY_PUBLIC_DOOR;
  }
});
