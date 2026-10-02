import {
  CAMPAIGNS_PATH,
  SETTINGS_BILLING_PATH,
  SETTINGS_PROFILE_PATH,
  SETTINGS_TEAM_PATH,
  WEBSITE_PATH,
} from "@/lib/admin-canonical-routes";
import { isCoreOrAbove, isProPlan } from "@/lib/shell/tenant-shell-api";

export type NavLockState = "pending" | "unlocked" | "locked" | "hidden";
export type NavRequiredPlan = "Core" | "Pro";
export type NavDestinationUi =
  | "pending"
  | "content"
  | "upgrade"
  | "ask-admin"
  | "denied"
  | "hidden";

export type NavDestinationKey =
  | "dashboard"
  | "clients"
  | "activities"
  | "follow-up"
  | "analytics"
  | "ai"
  | "website"
  | "campaigns"
  | "settings"
  | "team"
  | "billing"
  | "custom-domain";

export type NavEntitlementContext = {
  plan: string | null | undefined;
  isTenantAdmin: boolean | null | undefined;
  isBillingOwner: boolean | null | undefined;
  shellReady: boolean;
};

export type NavEntitlement = {
  key: NavDestinationKey;
  state: NavLockState;
  requiredPlan: NavRequiredPlan | null;
  destination: NavDestinationUi;
};

export type FooterNavItem = {
  key: "settings" | "team" | "billing";
  href: string;
  label: string;
  entitlement: NavEntitlement;
};

const ALWAYS_UNLOCKED: NavDestinationKey[] = [
  "dashboard",
  "clients",
  "activities",
  "follow-up",
  "analytics",
  "ai",
  "settings",
];

const KNOWN_PLANS = new Set(["Basic", "Core", "Pro", "Enterprise"]);

function recognizedPlan(plan: string | null | undefined): string | null {
  if (!plan || !KNOWN_PLANS.has(plan)) {
    return null;
  }
  return plan;
}

function unlocked(key: NavDestinationKey): NavEntitlement {
  return { key, state: "unlocked", requiredPlan: null, destination: "content" };
}

function pending(key: NavDestinationKey): NavEntitlement {
  return { key, state: "pending", requiredPlan: null, destination: "pending" };
}

function hidden(key: NavDestinationKey, destination: NavDestinationUi = "hidden"): NavEntitlement {
  return { key, state: "hidden", requiredPlan: null, destination };
}

function locked(
  key: NavDestinationKey,
  requiredPlan: NavRequiredPlan,
  isTenantAdmin: boolean
): NavEntitlement {
  return {
    key,
    state: "locked",
    requiredPlan,
    destination: isTenantAdmin ? "upgrade" : "ask-admin",
  };
}

export function resolveNavEntitlement(
  key: NavDestinationKey,
  ctx: NavEntitlementContext
): NavEntitlement {
  if (ALWAYS_UNLOCKED.includes(key)) {
    return unlocked(key);
  }

  if (!ctx.shellReady) {
    if (key === "website" || key === "campaigns") {
      return pending(key);
    }
    return hidden(key);
  }

  const plan = recognizedPlan(ctx.plan);
  if (!plan) {
    if (key === "website" || key === "campaigns") {
      return pending(key);
    }
    return hidden(key);
  }
  const isAdmin = ctx.isTenantAdmin === true;
  const isBillingOwner = ctx.isBillingOwner === true;

  if (key === "website") {
    return isCoreOrAbove(plan) ? unlocked(key) : locked(key, "Core", isAdmin);
  }

  if (key === "campaigns") {
    return isProPlan(plan) ? unlocked(key) : locked(key, "Pro", isAdmin);
  }

  if (key === "team") {
    if (!isAdmin) {
      return hidden(key, "denied");
    }
    return isCoreOrAbove(plan) ? unlocked(key) : locked(key, "Core", true);
  }

  if (key === "billing") {
    if (!isAdmin) {
      return hidden(key, "denied");
    }
    if (plan === "Basic" || isBillingOwner) {
      return unlocked(key);
    }
    return hidden(key);
  }

  if (key === "custom-domain") {
    if (!isAdmin || plan !== "Enterprise") {
      return hidden(key);
    }
    return unlocked(key);
  }

  return unlocked(key);
}

export function navItemAccessibleName(
  label: string,
  entitlement: Pick<NavEntitlement, "state" | "requiredPlan">
): string {
  if (entitlement.state === "locked" && entitlement.requiredPlan) {
    return `${label}, locked, requires ${entitlement.requiredPlan} plan`;
  }
  return label;
}

export function destinationKeyFromHref(href: string): NavDestinationKey | null {
  if (href === WEBSITE_PATH) {
    return "website";
  }
  if (href === CAMPAIGNS_PATH) {
    return "campaigns";
  }
  if (href === SETTINGS_PROFILE_PATH || href === "/settings") {
    return "settings";
  }
  if (href === SETTINGS_TEAM_PATH) {
    return "team";
  }
  if (href === SETTINGS_BILLING_PATH) {
    return "billing";
  }
  if (href === "/analytics" || href === "/reports") {
    return "analytics";
  }
  if (href === "/ai") {
    return "ai";
  }
  if (href === "/dashboard") {
    return "dashboard";
  }
  if (href === "/clients") {
    return "clients";
  }
  if (href === "/activities") {
    return "activities";
  }
  if (href === "/follow-up") {
    return "follow-up";
  }
  return null;
}

export function resolveHrefEntitlement(
  href: string,
  ctx: NavEntitlementContext
): NavEntitlement | null {
  const key = destinationKeyFromHref(href);
  if (!key) {
    return null;
  }
  return resolveNavEntitlement(key, ctx);
}

export function entitlementContextFromShell(shell: {
  plan: string;
  isTenantAdmin: boolean;
  isBillingOwner: boolean;
} | null): NavEntitlementContext {
  if (!shell) {
    return {
      plan: null,
      isTenantAdmin: null,
      isBillingOwner: null,
      shellReady: false,
    };
  }

  return {
    plan: shell.plan,
    isTenantAdmin: shell.isTenantAdmin,
    isBillingOwner: shell.isBillingOwner,
    shellReady: true,
  };
}

export function resolveFooterItems(ctx: NavEntitlementContext): FooterNavItem[] {
  const items: FooterNavItem[] = [
    {
      key: "settings",
      href: SETTINGS_PROFILE_PATH,
      label: "Settings",
      entitlement: resolveNavEntitlement("settings", ctx),
    },
  ];

  const team = resolveNavEntitlement("team", ctx);
  if (team.state !== "hidden" && team.state !== "pending") {
    items.push({
      key: "team",
      href: SETTINGS_TEAM_PATH,
      label: "Team",
      entitlement: team,
    });
  }

  const billing = resolveNavEntitlement("billing", ctx);
  if (billing.state !== "hidden" && billing.state !== "pending") {
    items.push({
      key: "billing",
      href: SETTINGS_BILLING_PATH,
      label: "Billing",
      entitlement: billing,
    });
  }

  return items;
}

export function isCustomDomainSettingsVisible(ctx: NavEntitlementContext): boolean {
  return resolveNavEntitlement("custom-domain", ctx).state === "unlocked";
}
