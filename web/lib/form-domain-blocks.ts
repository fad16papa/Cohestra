import { buildRegistrationCapacitySummary } from "@/lib/registration-capacity-summary";
import { campaignAssetPath } from "@/lib/registration-theme-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

export const FORM_COMPOSITION_DOMAIN_TYPES = [
  "activityDetails",
  "communityIdentity",
  "capacityStatus",
] as const;

export type FormCompositionDomainType =
  (typeof FORM_COMPOSITION_DOMAIN_TYPES)[number];

export const DOMAIN_LOCKED_REASON =
  "Activity and community blocks require Core or Pro.";

export const FORM_DOMAIN_BLOCK_LABELS: Record<
  FormCompositionDomainType,
  string
> = {
  activityDetails: "Activity details",
  communityIdentity: "Community identity",
  capacityStatus: "Capacity",
};

export function isFormCompositionDomainType(
  value: string | null | undefined
): value is FormCompositionDomainType {
  return FORM_COMPOSITION_DOMAIN_TYPES.includes(
    value as FormCompositionDomainType
  );
}

export type FormDomainContext = {
  schedule?: string | null;
  location?: string | null;
  communityLabel?: string | null;
  logoAssetId?: string | null;
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
};

export type ResolvedActivityDetailsBlock = {
  domain: "activityDetails";
  visible: boolean;
  schedule: string | null;
  location: string | null;
};

export type ResolvedCommunityIdentityBlock = {
  domain: "communityIdentity";
  visible: boolean;
  communityLabel: string | null;
  logoUrl: string | null;
  logoAlt: string;
};

export type ResolvedCapacityStatusBlock = {
  domain: "capacityStatus";
  visible: boolean;
  summary: ReturnType<typeof buildRegistrationCapacitySummary>;
};

export type ResolvedFormDomainBlock =
  | ResolvedActivityDetailsBlock
  | ResolvedCommunityIdentityBlock
  | ResolvedCapacityStatusBlock
  | { domain: "unknown"; visible: false };

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveFormDomainBlock(
  domain: string | null | undefined,
  context: FormDomainContext | null | undefined
): ResolvedFormDomainBlock {
  const safeContext = context ?? {};

  if (domain === "activityDetails") {
    const schedule = trimOrNull(safeContext.schedule);
    const location = trimOrNull(safeContext.location);
    return {
      domain: "activityDetails",
      visible: schedule !== null || location !== null,
      schedule,
      location,
    };
  }

  if (domain === "communityIdentity") {
    const communityLabel = trimOrNull(safeContext.communityLabel);
    const logoAssetId = trimOrNull(safeContext.logoAssetId);
    const logoUrl = logoAssetId
      ? resolveHeroImageUrl(campaignAssetPath(logoAssetId))
      : null;
    return {
      domain: "communityIdentity",
      visible: communityLabel !== null || logoUrl !== null,
      communityLabel,
      logoUrl,
      logoAlt: communityLabel ? `${communityLabel} logo` : "Community logo",
    };
  }

  if (domain === "capacityStatus") {
    const summary = buildRegistrationCapacitySummary({
      registrationCount: safeContext.registrationCount,
      maxRegistrants: safeContext.maxRegistrants,
      isRegistrationFull: safeContext.isRegistrationFull,
    });
    return {
      domain: "capacityStatus",
      visible: summary.kind !== "hidden",
      summary,
    };
  }

  return { domain: "unknown", visible: false };
}

export function buildFormDomainContext(input: FormDomainContext): FormDomainContext {
  return {
    schedule: input.schedule ?? null,
    location: input.location ?? null,
    communityLabel: input.communityLabel ?? null,
    logoAssetId: input.logoAssetId ?? null,
    registrationCount: input.registrationCount ?? null,
    maxRegistrants: input.maxRegistrants ?? null,
    isRegistrationFull: input.isRegistrationFull === true,
  };
}
