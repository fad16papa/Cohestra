import { describe, expect, it } from "vitest";

import {
  entitlementContextFromShell,
  resolveNavEntitlement,
  type NavLockState,
  type NavRequiredPlan,
} from "@/lib/admin-nav-entitlements";
import { parseTenantShell, recognizedTenantPlan } from "@/lib/shell/tenant-shell-api";

function resolveFromRaw(
  raw: Record<string, unknown>,
  key: "website" | "campaigns"
) {
  const shell = parseTenantShell({
    isTenantAdmin: true,
    isBillingOwner: true,
    ...raw,
  });
  return resolveNavEntitlement(key, entitlementContextFromShell(shell));
}

function expectNav(
  raw: Record<string, unknown>,
  website: { state: NavLockState; requiredPlan: NavRequiredPlan | null },
  campaigns: { state: NavLockState; requiredPlan: NavRequiredPlan | null }
) {
  const websiteEntitlement = resolveFromRaw(raw, "website");
  const campaignsEntitlement = resolveFromRaw(raw, "campaigns");
  expect(websiteEntitlement.state).toBe(website.state);
  expect(websiteEntitlement.requiredPlan).toBe(website.requiredPlan);
  expect(campaignsEntitlement.state).toBe(campaigns.state);
  expect(campaignsEntitlement.requiredPlan).toBe(campaigns.requiredPlan);
}

describe("parseTenantShell → entitlementContextFromShell → resolveNavEntitlement", () => {
  it("does not invent Basic locks when the shell plan is missing or null", () => {
    const pending = { state: "pending" as const, requiredPlan: null };
    expect(parseTenantShell({}).plan).toBeNull();
    expect(parseTenantShell({ plan: null }).plan).toBeNull();
    expect(parseTenantShell({ Plan: null }).plan).toBeNull();
    expect(parseTenantShell({ plan: "   " }).plan).toBeNull();
    expectNav({}, pending, pending);
    expectNav({ plan: null }, pending, pending);
    expectNav({ Plan: null }, pending, pending);
    expectNav({ plan: "   " }, pending, pending);
  });

  it("keeps an unknown future plan pending instead of inventing Basic locks", () => {
    const pending = { state: "pending" as const, requiredPlan: null };
    expect(parseTenantShell({ plan: "Platinum" }).plan).toBe("Platinum");
    expectNav({ plan: "Platinum" }, pending, pending);
    expectNav({ Plan: "Gold-2027" }, pending, pending);
  });

  it("locks Basic Website to Core and Campaigns to Pro", () => {
    expect(parseTenantShell({ plan: "Basic" }).plan).toBe("Basic");
    expectNav(
      { plan: "Basic" },
      { state: "locked", requiredPlan: "Core" },
      { state: "locked", requiredPlan: "Pro" }
    );
  });

  it("unlocks Core Website and still locks Campaigns to Pro", () => {
    expectNav(
      { plan: "Core" },
      { state: "unlocked", requiredPlan: null },
      { state: "locked", requiredPlan: "Pro" }
    );
  });

  it("unlocks Website and Campaigns on Pro and Enterprise", () => {
    const unlocked = { state: "unlocked" as const, requiredPlan: null };
    expectNav({ plan: "Pro" }, unlocked, unlocked);
    expectNav({ Plan: "Enterprise" }, unlocked, unlocked);
  });

  it("does not treat a missing or unknown plan as a known billing SKU", () => {
    expect(recognizedTenantPlan(parseTenantShell({}).plan)).toBeNull();
    expect(recognizedTenantPlan(parseTenantShell({ plan: null }).plan)).toBeNull();
    expect(recognizedTenantPlan("Platinum")).toBeNull();
    expect(recognizedTenantPlan("Basic")).toBe("Basic");
    expect(recognizedTenantPlan("Core")).toBe("Core");
    expect(recognizedTenantPlan("Pro")).toBe("Pro");
    expect(recognizedTenantPlan("Enterprise")).toBe("Enterprise");
  });
});
