import type { ActivityFormSchema, ActivityStatus } from "@/lib/activities-api";
import { parseFormSchema } from "@/lib/activities-api";
import { getPublicApiBaseUrl } from "@/lib/api";
import { createIdempotencyKey } from "@/lib/idempotency-key";

export type PublicActivity = {
  slug: string;
  name: string;
  status: ActivityStatus;
  isRegistrationOpen: boolean;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl: string | null;
  accentColor: string | null;
  formSchema: ActivityFormSchema | null;
};

function parseActivityStatus(raw: unknown): ActivityStatus {
  if (raw === "draft" || raw === "published" || raw === "archived") {
    return raw;
  }

  throw new Error("Invalid public activity status");
}

export function parsePublicActivity(raw: Record<string, unknown>): PublicActivity {
  const slug = raw.slug ?? raw.Slug;
  const name = raw.name ?? raw.Name;
  const status = raw.status ?? raw.Status;
  const isRegistrationOpen = raw.isRegistrationOpen ?? raw.IsRegistrationOpen;
  const schedule = raw.schedule ?? raw.Schedule;
  const location = raw.location ?? raw.Location;
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const heroImageUrl = raw.heroImageUrl ?? raw.HeroImageUrl;
  const accentColor = raw.accentColor ?? raw.AccentColor;
  const formSchema = raw.formSchema ?? raw.FormSchema;

  if (
    typeof slug !== "string" ||
    typeof name !== "string" ||
    typeof isRegistrationOpen !== "boolean" ||
    typeof schedule !== "string" ||
    typeof location !== "string" ||
    typeof communityLabel !== "string"
  ) {
    throw new Error("Invalid public activity payload");
  }

  return {
    slug,
    name,
    status: parseActivityStatus(status),
    isRegistrationOpen,
    schedule,
    location,
    communityLabel,
    heroImageUrl: typeof heroImageUrl === "string" ? heroImageUrl : null,
    accentColor: typeof accentColor === "string" ? accentColor : null,
    formSchema:
      formSchema === null || formSchema === undefined
        ? null
        : parseFormSchema(formSchema),
  };
}

export type PublicActivityFetchResult =
  | { kind: "ok"; activity: PublicActivity }
  | { kind: "not-found" }
  | { kind: "error" };

export async function fetchPublicActivityBySlug(
  slug: string
): Promise<PublicActivityFetchResult> {
  const baseUrl = getPublicApiBaseUrl();

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/public/activities/${encodeURIComponent(slug)}`,
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

export type PublicRegistrationSubmitResult = {
  status: string;
  message: string;
  registrationId: string;
  registrationNumber: string;
  clientId: string;
  confirmationEmailSent: boolean;
  confirmationEmail: string | null;
};

export async function submitPublicRegistration(
  activitySlug: string,
  answers: Record<string, unknown>,
  options?: { idempotencyKey?: string }
): Promise<PublicRegistrationSubmitResult> {
  const idempotencyKey = options?.idempotencyKey ?? createIdempotencyKey();

  const response = await fetch(
    `${getPublicApiBaseUrl()}/api/v1/public/registrations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        activitySlug,
        answers,
      }),
    }
  );

  if (response.status === 201 || response.status === 202) {
    const raw = (await response.json()) as Record<string, unknown>;
    const status = raw.status ?? raw.Status;
    const message = raw.message ?? raw.Message;
    const registrationId = raw.registrationId ?? raw.RegistrationId;
    const registrationNumber = raw.registrationNumber ?? raw.RegistrationNumber;
    const clientId = raw.clientId ?? raw.ClientId;
    const confirmationEmailSent =
      raw.confirmationEmailSent ?? raw.ConfirmationEmailSent ?? false;
    const confirmationEmailRaw =
      raw.confirmationEmail ?? raw.ConfirmationEmail ?? null;

    if (
      typeof status !== "string" ||
      typeof message !== "string" ||
      typeof registrationId !== "string" ||
      typeof registrationNumber !== "string" ||
      typeof clientId !== "string" ||
      typeof confirmationEmailSent !== "boolean"
    ) {
      throw new Error("Invalid registration success payload.");
    }

    const confirmationEmail =
      typeof confirmationEmailRaw === "string" && confirmationEmailRaw.trim()
        ? confirmationEmailRaw.trim()
        : null;

    return {
      status,
      message,
      registrationId,
      registrationNumber,
      clientId,
      confirmationEmailSent,
      confirmationEmail,
    };
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Too many registration attempts from this workspace. Please wait a minute and try again."
      );
    }

    let message = `Registration failed (${response.status})`;
    try {
      const problem = (await response.json()) as Record<string, unknown>;
      const detail = problem.detail ?? problem.Detail;
      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      }
    } catch {
      // Keep generic message when problem details are unavailable.
    }

    throw new Error(message);
  }

  throw new Error("Unexpected registration response.");
}
