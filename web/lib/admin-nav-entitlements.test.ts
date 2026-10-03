import { describe, expect, it } from "vitest";

import {
  entitlementContextFromShell,
  isCustomDomainSettingsVisible,
  navItemAccessibleName,
  resolveBillingSettingsAccess,
  resolveFooterItems,
  resolveHrefEntitlement,
  resolveNavEntitlement,
  type NavDestinationKey,
  type NavDestinationUi,
  type NavEntitlementContext,
  type NavLockState,
} from "@/lib/admin-nav-entitlements";

const PLANS = ["Basic", "Core", "Pro", "Enterprise"] as const;
const DESTINATIONS: NavDestinationKey[] = [
  "dashboard",
  "clients",
  "activities",
  "follow-up",
  "analytics",
  "ai",
  "website",
  "campaigns",
  "settings",
  "team",
  "billing",
  "custom-domain",
];

function ctx(partial: Partial<NavEntitlementContext> & Pick<NavEntitlementContext, "shellReady">): NavEntitlementContext {
  return {
    plan: partial.plan ?? null,
    isTenantAdmin: partial.isTenantAdmin ?? null,
    isBillingOwner: partial.isBillingOwner ?? null,
    shellReady: partial.shellReady,
  };
}

function admin(plan: string, billingOwner = true): NavEntitlementContext {
  return ctx({ shellReady: true, plan, isTenantAdmin: true, isBillingOwner: billingOwner });
}

function member(plan: string): NavEntitlementContext {
  return ctx({ shellReady: true, plan, isTenantAdmin: false, isBillingOwner: false });
}

function expectState(
  key: NavDestinationKey,
  context: NavEntitlementContext,
  state: NavLockState,
  requiredPlan: "Core" | "Pro" | null,
  destination: NavDestinationUi
) {
  expect(resolveNavEntitlement(key, context)).toEqual({
    key,
    state,
    requiredPlan,
    destination,
  });
}

describe("Story 39.3 nav entitlement matrix", () => {
  it("keeps relationship rooms, Analytics, AI, and Settings unlocked for every plan and role", () => {
    const always: NavDestinationKey[] = [
      "dashboard",
      "clients",
      "activities",
      "follow-up",
      "analytics",
      "ai",
      "settings",
    ];

    for (const plan of PLANS) {
      for (const actor of [admin(plan), member(plan)]) {
        for (const key of always) {
          expectState(key, actor, "unlocked", null, "content");
        }
      }
    }

    expectState("analytics", admin("Basic"), "unlocked", null, "content");
    expectState("analytics", member("Basic"), "unlocked", null, "content");
  });

  it("locks Website on Basic and unlocks Core+", () => {
    expectState("website", admin("Basic"), "locked", "Core", "upgrade");
    expectState("website", member("Basic"), "locked", "Core", "ask-admin");
    expectState("website", admin("Core"), "unlocked", null, "content");
    expectState("website", member("Core"), "unlocked", null, "content");
    expectState("website", admin("Pro"), "unlocked", null, "content");
    expectState("website", member("Pro"), "unlocked", null, "content");
    expectState("website", admin("Enterprise"), "unlocked", null, "content");
  });

  it("locks Campaigns below Pro and never hides them", () => {
    expectState("campaigns", admin("Basic"), "locked", "Pro", "upgrade");
    expectState("campaigns", member("Basic"), "locked", "Pro", "ask-admin");
    expectState("campaigns", admin("Core"), "locked", "Pro", "upgrade");
    expectState("campaigns", member("Core"), "locked", "Pro", "ask-admin");
    expectState("campaigns", admin("Pro"), "unlocked", null, "content");
    expectState("campaigns", member("Pro"), "unlocked", null, "content");
    expectState("campaigns", admin("Enterprise"), "unlocked", null, "content");
  });

  it("hides Team for members and locks it for Basic admins", () => {
    expectState("team", member("Basic"), "hidden", null, "denied");
    expectState("team", member("Pro"), "hidden", null, "denied");
    expectState("team", admin("Basic"), "locked", "Core", "upgrade");
    expectState("team", admin("Core"), "unlocked", null, "content");
    expectState("team", admin("Pro"), "unlocked", null, "content");
  });

  it("shows Billing to Basic admins or billing owners, never to members", () => {
    expectState("billing", member("Basic"), "hidden", null, "denied");
    expectState("billing", member("Pro"), "hidden", null, "denied");
    expectState("billing", admin("Basic", false), "unlocked", null, "content");
    expectState("billing", admin("Core", true), "unlocked", null, "content");
    expectState("billing", admin("Core", false), "hidden", null, "hidden");
    expectState("billing", admin("Pro", false), "hidden", null, "hidden");
    expectState("billing", admin("Pro", true), "unlocked", null, "content");
    expectState("billing", admin("Enterprise", false), "hidden", null, "hidden");
    expectState("billing", admin("Enterprise", true), "unlocked", null, "content");
  });

  it("keeps Enterprise billing owner-managed for non-owners and content for owners", () => {
    expect(
      resolveBillingSettingsAccess({
        plan: "Enterprise",
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("owner-managed");
    expect(
      resolveBillingSettingsAccess({
        plan: "Enterprise",
        isTenantAdmin: true,
        isBillingOwner: true,
      })
    ).toBe("content");
    expect(
      resolveBillingSettingsAccess({
        plan: "Core",
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("owner-managed");
    expect(
      resolveBillingSettingsAccess({
        plan: "Pro",
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("owner-managed");
    expect(
      resolveBillingSettingsAccess({
        plan: "Basic",
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("content");
    expect(
      resolveBillingSettingsAccess({
        plan: null,
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("content");
    expect(
      resolveBillingSettingsAccess({
        plan: "Platinum",
        isTenantAdmin: true,
        isBillingOwner: false,
      })
    ).toBe("content");
    expect(
      resolveBillingSettingsAccess({
        plan: "Enterprise",
        isTenantAdmin: false,
        isBillingOwner: false,
      })
    ).toBe("denied");
  });

  it("hides custom domain except for Enterprise admins", () => {
    expect(isCustomDomainSettingsVisible(admin("Basic"))).toBe(false);
    expect(isCustomDomainSettingsVisible(admin("Core"))).toBe(false);
    expect(isCustomDomainSettingsVisible(admin("Pro"))).toBe(false);
    expect(isCustomDomainSettingsVisible(member("Enterprise"))).toBe(false);
    expect(isCustomDomainSettingsVisible(admin("Enterprise"))).toBe(true);
  });

  it("does not invent Basic locks from a missing or unknown plan", () => {
    const unknown = ctx({
      shellReady: true,
      plan: "",
      isTenantAdmin: true,
      isBillingOwner: true,
    });
    expectState("website", unknown, "pending", null, "pending");
    expectState("campaigns", unknown, "pending", null, "pending");
    expectState("team", unknown, "hidden", null, "hidden");
    expect(resolveFooterItems(unknown).map((item) => item.key)).toEqual(["settings"]);
  });

  it("does not show false locks while the shell is loading", () => {
    const pending = ctx({ shellReady: false });
    expectState("website", pending, "pending", null, "pending");
    expectState("campaigns", pending, "pending", null, "pending");
    expectState("analytics", pending, "unlocked", null, "content");
    expectState("team", pending, "hidden", null, "hidden");
    expectState("billing", pending, "hidden", null, "hidden");
    expect(resolveFooterItems(pending).map((item) => item.key)).toEqual(["settings"]);
  });

  it("never converts a role denial into an upgrade destination", () => {
    for (const plan of PLANS) {
      expect(resolveNavEntitlement("team", member(plan)).destination).toBe("denied");
      expect(resolveNavEntitlement("billing", member(plan)).destination).toBe("denied");
      expect(resolveNavEntitlement("team", member(plan)).destination).not.toBe("upgrade");
    }
  });

  it("covers the full destination list for admin and member on each plan", () => {
    const snapshots: string[] = [];
    for (const plan of PLANS) {
      for (const [role, context] of [
        ["admin", admin(plan)],
        ["member", member(plan)],
      ] as const) {
        for (const key of DESTINATIONS) {
          const result = resolveNavEntitlement(key, context);
          snapshots.push(
            `${plan}/${role}/${key}=${result.state}:${result.requiredPlan ?? "-"}:${result.destination}`
          );
        }
      }
    }
    expect(snapshots).toHaveLength(PLANS.length * 2 * DESTINATIONS.length);
    expect(snapshots.filter((row) => row.includes("analytics=locked"))).toEqual([]);
    expect(snapshots.filter((row) => row.startsWith("Basic/admin/website="))).toEqual([
      "Basic/admin/website=locked:Core:upgrade",
    ]);
    expect(snapshots.filter((row) => row.startsWith("Basic/member/team="))).toEqual([
      "Basic/member/team=hidden:-:denied",
    ]);
  });

  it("builds accessible names for locked items", () => {
    expect(
      navItemAccessibleName("Website", { state: "locked", requiredPlan: "Core" })
    ).toBe("Website, locked, requires Core plan");
    expect(
      navItemAccessibleName("Campaigns", { state: "locked", requiredPlan: "Pro" })
    ).toBe("Campaigns, locked, requires Pro plan");
    expect(
      navItemAccessibleName("Website", { state: "unlocked", requiredPlan: null })
    ).toBe("Website");
    expect(
      navItemAccessibleName("Website", { state: "pending", requiredPlan: null })
    ).toBe("Website");
  });

  it("resolves footer items from the same mapping", () => {
    expect(resolveFooterItems(admin("Basic")).map((item) => item.key)).toEqual([
      "settings",
      "team",
      "billing",
    ]);
    expect(resolveFooterItems(admin("Basic")).find((item) => item.key === "team")?.entitlement.state).toBe(
      "locked"
    );
    expect(resolveFooterItems(member("Pro")).map((item) => item.key)).toEqual(["settings"]);
    expect(resolveFooterItems(admin("Core", false)).map((item) => item.key)).toEqual([
      "settings",
      "team",
    ]);
  });

  it("maps hrefs and shell objects without inventing thresholds", () => {
    const fromShell = entitlementContextFromShell(null);
    expect(fromShell.shellReady).toBe(false);
    expect(resolveHrefEntitlement("/dashboard/website", admin("Basic"))?.state).toBe("locked");
    expect(resolveHrefEntitlement("/campaigns", admin("Core"))?.requiredPlan).toBe("Pro");
    expect(resolveHrefEntitlement("/analytics", admin("Basic"))?.state).toBe("unlocked");
    expect(resolveHrefEntitlement("/settings/team", member("Pro"))?.destination).toBe("denied");
    expect(
      entitlementContextFromShell({
        plan: "Pro",
        isTenantAdmin: true,
        isBillingOwner: true,
      }).shellReady
    ).toBe(true);
  });
});
