import {
  SETTINGS_APPEARANCE_PATH,
  SETTINGS_BILLING_PATH,
  SETTINGS_BRAND_PATH,
  SETTINGS_DOMAIN_PATH,
  SETTINGS_EMBED_PATH,
  SETTINGS_NOTIFICATIONS_PATH,
  SETTINGS_ORGANIZATION_PATH,
  SETTINGS_PATH,
  SETTINGS_PLAN_PATH,
  SETTINGS_PROFILE_PATH,
  SETTINGS_SUPPORT_PATH,
  SETTINGS_TEAM_PATH,
  pathWithQuery,
} from "@/lib/admin-canonical-routes";
import {
  settingsSections,
  type SettingsSectionGroup,
  type SettingsSectionId,
  type SettingsSectionMeta,
} from "@/components/settings/settings-sections";

export type SettingsNavKey = SettingsSectionId | "settings-team" | "settings-billing";

export type SettingsRouteMeta = {
  key: SettingsNavKey;
  href: string;
  label: string;
  description: string;
  group: SettingsSectionGroup;
  adminOnly: boolean;
  domainOnly?: boolean;
};

const SECTION_PATHS: Record<SettingsSectionId, string> = {
  "settings-plan": SETTINGS_PLAN_PATH,
  "settings-brand": SETTINGS_BRAND_PATH,
  "settings-organization": SETTINGS_ORGANIZATION_PATH,
  "settings-notifications": SETTINGS_NOTIFICATIONS_PATH,
  "settings-embed": SETTINGS_EMBED_PATH,
  "settings-domain": SETTINGS_DOMAIN_PATH,
  "settings-account": SETTINGS_PROFILE_PATH,
  "settings-support": SETTINGS_SUPPORT_PATH,
  "settings-appearance": SETTINGS_APPEARANCE_PATH,
};

const TEAM_META: SettingsRouteMeta = {
  key: "settings-team",
  href: SETTINGS_TEAM_PATH,
  label: "Team",
  description: "Members, invites, and seat use for this workspace.",
  group: "workspace",
  adminOnly: true,
};

const BILLING_META: SettingsRouteMeta = {
  key: "settings-billing",
  href: SETTINGS_BILLING_PATH,
  label: "Billing",
  description: "Plan, invoices, and payment method for this workspace.",
  group: "workspace",
  adminOnly: true,
};

const LEGACY_SECTION_ALIASES: Record<string, string> = {
  plan: SETTINGS_PLAN_PATH,
  "settings-plan": SETTINGS_PLAN_PATH,
  "plan-limits": SETTINGS_PLAN_PATH,
  brand: SETTINGS_BRAND_PATH,
  "settings-brand": SETTINGS_BRAND_PATH,
  organization: SETTINGS_ORGANIZATION_PATH,
  "settings-organization": SETTINGS_ORGANIZATION_PATH,
  notifications: SETTINGS_NOTIFICATIONS_PATH,
  "settings-notifications": SETTINGS_NOTIFICATIONS_PATH,
  embed: SETTINGS_EMBED_PATH,
  "settings-embed": SETTINGS_EMBED_PATH,
  domain: SETTINGS_DOMAIN_PATH,
  "settings-domain": SETTINGS_DOMAIN_PATH,
  account: SETTINGS_PROFILE_PATH,
  "settings-account": SETTINGS_PROFILE_PATH,
  profile: SETTINGS_PROFILE_PATH,
  support: SETTINGS_SUPPORT_PATH,
  "settings-support": SETTINGS_SUPPORT_PATH,
  appearance: SETTINGS_APPEARANCE_PATH,
  "settings-appearance": SETTINGS_APPEARANCE_PATH,
  team: SETTINGS_TEAM_PATH,
  billing: SETTINGS_BILLING_PATH,
};

export function normalizeSettingsPathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function settingsPathForSectionId(id: SettingsSectionId): string {
  return SECTION_PATHS[id];
}

export function getDefaultSettingsPath(isTenantAdmin: boolean): string {
  return isTenantAdmin ? SETTINGS_PLAN_PATH : SETTINGS_PROFILE_PATH;
}

export function mapLegacySettingsSection(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  if (!key) {
    return null;
  }
  return LEGACY_SECTION_ALIASES[key] ?? null;
}

function sectionMeta(section: SettingsSectionMeta): SettingsRouteMeta {
  return {
    key: section.id,
    href: SECTION_PATHS[section.id],
    label: section.label,
    description: section.description,
    group: section.group,
    adminOnly: section.adminOnly === true,
    domainOnly: section.id === "settings-domain",
  };
}

export function getAllSettingsRouteMeta(): SettingsRouteMeta[] {
  const sectionRoutes = settingsSections.map(sectionMeta);
  const teamIndex = sectionRoutes.findIndex((item) => item.group === "personal");
  const insertAt = teamIndex === -1 ? sectionRoutes.length : teamIndex;
  return [
    ...sectionRoutes.slice(0, insertAt),
    TEAM_META,
    BILLING_META,
    ...sectionRoutes.slice(insertAt),
  ];
}

export function getSettingsRouteMeta(pathname: string): SettingsRouteMeta | null {
  const normalized = normalizeSettingsPathname(pathname);
  return getAllSettingsRouteMeta().find((item) => item.href === normalized) ?? null;
}

export function isAdminOnlySettingsPath(pathname: string): boolean {
  const meta = getSettingsRouteMeta(pathname);
  if (!meta) {
    return false;
  }
  return meta.adminOnly && meta.href !== SETTINGS_BILLING_PATH;
}

export function isSettingsDomainPath(pathname: string): boolean {
  return normalizeSettingsPathname(pathname) === SETTINGS_DOMAIN_PATH;
}

export function isSettingsIndexPath(pathname: string): boolean {
  return normalizeSettingsPathname(pathname) === SETTINGS_PATH;
}

function copySearchParamsWithoutLegacy(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("section");
  next.delete("activeId");
  return next;
}

export function resolveSettingsSearchRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  isTenantAdmin: boolean | null
): string | null {
  const normalized = normalizeSettingsPathname(pathname);
  const rest = copySearchParamsWithoutLegacy(searchParams);
  const restQuery = rest.toString();
  const legacyRaw = searchParams.get("section") ?? searchParams.get("activeId");
  const mapped = mapLegacySettingsSection(legacyRaw);

  if (mapped) {
    const destination = pathWithQuery(mapped, restQuery);
    const currentStripped = pathWithQuery(normalized, restQuery);
    if (destination !== pathWithQuery(normalized, searchParams.toString())) {
      return destination;
    }
    if (legacyRaw != null && currentStripped !== pathWithQuery(normalized, searchParams.toString())) {
      return currentStripped;
    }
    return null;
  }

  if (legacyRaw != null && legacyRaw.trim() !== "") {
    const stripped = pathWithQuery(normalized, restQuery);
    if (stripped !== pathWithQuery(normalized, searchParams.toString())) {
      if (isSettingsIndexPath(normalized)) {
        if (isTenantAdmin == null) {
          return null;
        }
        return pathWithQuery(getDefaultSettingsPath(isTenantAdmin), restQuery);
      }
      return stripped === normalized && restQuery.length === 0 ? stripped : stripped;
    }
  }

  if (isSettingsIndexPath(normalized)) {
    if (isTenantAdmin == null) {
      return null;
    }
    return pathWithQuery(getDefaultSettingsPath(isTenantAdmin), restQuery);
  }

  return null;
}
