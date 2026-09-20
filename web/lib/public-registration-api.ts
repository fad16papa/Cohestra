import type {
  ActivityFormSchema,
  ActivityStatus,
  RegistrationThemePreset,
  ResolvedRegistrationDesignTokens,
  ResolvedRegistrationExperience,
} from "@/lib/activities-api";
import { parseFormSchema } from "@/lib/activities-api";
import { resolveRegistrationDesignTokens } from "@/lib/registration-design-tokens";
import { resolveRegistrationExperience } from "@/lib/registration-experience";
import { getPublicApiBaseUrl, getTenantForwardedHostHeaders } from "@/lib/api";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { parseProblemFields } from "@/lib/problem-details";
import { PUBLIC_PLAN_REGISTRATION_LIMIT_COPY } from "@/lib/public-registration-messages";

export type PublicActivity = {
  slug: string;
  name: string;
  status: ActivityStatus;
  isRegistrationOpen: boolean;
  isRegistrationFull: boolean;
  isRegistrationPaused: boolean;
  isRegistrationClosedAt: boolean;
  maxRegistrants: number | null;
  registrationCount: number;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl: string | null;
  accentColor: string | null;
  preset: RegistrationThemePreset;
  logoAssetId: string | null;
  formSchema: ActivityFormSchema | null;
  resolvedExperience: ResolvedRegistrationExperience;
  resolvedDesignTokens: ResolvedRegistrationDesignTokens;
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
  const isRegistrationFull = raw.isRegistrationFull ?? raw.IsRegistrationFull;
  const isRegistrationPausedRaw = raw.isRegistrationPaused ?? raw.IsRegistrationPaused;
  const isRegistrationPaused =
    typeof isRegistrationPausedRaw === "boolean" ? isRegistrationPausedRaw : false;
  const isRegistrationClosedAtRaw =
    raw.isRegistrationClosedAt ?? raw.IsRegistrationClosedAt;
  const isRegistrationClosedAt =
    typeof isRegistrationClosedAtRaw === "boolean" ? isRegistrationClosedAtRaw : false;
  const maxRegistrantsRaw = raw.maxRegistrants ?? raw.MaxRegistrants;
  const registrationCountRaw = raw.registrationCount ?? raw.RegistrationCount;
  const schedule = raw.schedule ?? raw.Schedule;
  const location = raw.location ?? raw.Location;
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const heroImageUrl = raw.heroImageUrl ?? raw.HeroImageUrl;
  const accentColor = raw.accentColor ?? raw.AccentColor;
  const presetRaw = raw.preset ?? raw.Preset;
  const logoAssetId = raw.logoAssetId ?? raw.LogoAssetId;
  const formSchema = raw.formSchema ?? raw.FormSchema;
  const resolvedExperienceRaw =
    raw.resolvedExperience ?? raw.ResolvedExperience;
  const resolvedDesignTokensRaw =
    raw.resolvedDesignTokens ?? raw.ResolvedDesignTokens;

  if (
    typeof slug !== "string" ||
    typeof name !== "string" ||
    typeof isRegistrationOpen !== "boolean" ||
    typeof isRegistrationFull !== "boolean" ||
    typeof registrationCountRaw !== "number" ||
    typeof schedule !== "string" ||
    typeof location !== "string" ||
    typeof communityLabel !== "string"
  ) {
    throw new Error("Invalid public activity payload");
  }

  const preset: RegistrationThemePreset =
    presetRaw === "card" ||
    presetRaw === "immersive" ||
    presetRaw === "compact" ||
    presetRaw === "classic"
      ? presetRaw
      : "classic";

  const resolvedExperience = parsePublicResolvedExperience(resolvedExperienceRaw, preset);

  return {
    slug,
    name,
    status: parseActivityStatus(status),
    isRegistrationOpen,
    isRegistrationFull,
    isRegistrationPaused,
    isRegistrationClosedAt,
    maxRegistrants:
      typeof maxRegistrantsRaw === "number" && Number.isFinite(maxRegistrantsRaw)
        ? maxRegistrantsRaw
        : null,
    registrationCount: registrationCountRaw,
    schedule,
    location,
    communityLabel,
    heroImageUrl: typeof heroImageUrl === "string" ? heroImageUrl : null,
    accentColor: typeof accentColor === "string" ? accentColor : null,
    preset,
    logoAssetId: typeof logoAssetId === "string" ? logoAssetId : null,
    formSchema:
      formSchema === null || formSchema === undefined
        ? null
        : parseFormSchema(formSchema),
    resolvedExperience,
    resolvedDesignTokens: parsePublicResolvedDesignTokens(
      resolvedDesignTokensRaw,
      preset,
      resolvedExperience
    ),
  };
}

function parsePublicResolvedExperience(
  raw: unknown,
  preset: RegistrationThemePreset
): ResolvedRegistrationExperience {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const layout = record.layout ?? record.Layout;
    const style = record.style ?? record.Style;
    const flow = record.flow ?? record.Flow;
    const heroDisplay = record.heroDisplay ?? record.HeroDisplay;
    if (
      typeof layout === "string" &&
      typeof style === "string" &&
      typeof flow === "string" &&
      typeof heroDisplay === "string"
    ) {
      return { layout, style, flow, heroDisplay };
    }
  }

  return resolveRegistrationExperience({
    preset,
    inheritCommunityBrand: true,
    accentColor: null,
    heroImageUrl: null,
  }) as ResolvedRegistrationExperience;
}

function parsePublicResolvedDesignTokens(
  raw: unknown,
  preset: RegistrationThemePreset,
  resolvedExperience: ResolvedRegistrationExperience
): ResolvedRegistrationDesignTokens {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const typographyScale = record.typographyScale ?? record.TypographyScale;
    const fieldSize = record.fieldSize ?? record.FieldSize;
    const fieldRadius = record.fieldRadius ?? record.FieldRadius;
    const buttonWidth = record.buttonWidth ?? record.ButtonWidth;
    const surfaceEmphasis = record.surfaceEmphasis ?? record.SurfaceEmphasis;
    if (
      typeof typographyScale === "string" &&
      typeof fieldSize === "string" &&
      typeof fieldRadius === "string" &&
      typeof buttonWidth === "string" &&
      typeof surfaceEmphasis === "string"
    ) {
      return {
        typographyScale,
        fieldSize,
        fieldRadius,
        buttonWidth,
        surfaceEmphasis,
      };
    }
  }

  return resolveRegistrationDesignTokens({
    preset,
    inheritCommunityBrand: true,
    accentColor: null,
    heroImageUrl: null,
    experience: resolvedExperience,
  });
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
      {
        cache: "no-store",
        headers: getTenantForwardedHostHeaders(),
      }
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
  successCopyMarkdown: string | null;
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
        ...getTenantForwardedHostHeaders(),
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
    const successCopyRaw =
      raw.successCopyMarkdown ?? raw.SuccessCopyMarkdown ?? null;

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
    const successCopyMarkdown =
      typeof successCopyRaw === "string" && successCopyRaw.trim()
        ? successCopyRaw.trim()
        : null;

    return {
      status,
      message,
      registrationId,
      registrationNumber,
      clientId,
      confirmationEmailSent,
      confirmationEmail,
      successCopyMarkdown,
    };
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Too many registration attempts from this workspace. Please wait a minute and try again."
      );
    }

    let message = `Registration failed (${response.status})`;
    let errorCode: string | undefined;
    try {
      const problem = (await response.json()) as Record<string, unknown>;
      const parsed = parseProblemFields(problem);
      message = parsed.message;
      errorCode = parsed.errorCode;
    } catch {
      // Keep generic message when problem details are unavailable.
    }

    if (errorCode === "plan_registration_limit") {
      message = PUBLIC_PLAN_REGISTRATION_LIMIT_COPY.description;
    }

    const error = new Error(message) as Error & { errorCode?: string };
    if (errorCode) {
      error.errorCode = errorCode;
    }

    throw error;
  }

  throw new Error("Unexpected registration response.");
}
