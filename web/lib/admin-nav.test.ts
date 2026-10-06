/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
  adminNavItems,
  getAdminBreadcrumbs,
  isAdminNavItemActive,
} from "@/lib/admin-nav";
import {
  destinationWithSearch,
  isAiPath,
  isAnalyticsPath,
  isSettingsProfilePath,
} from "@/lib/admin-canonical-routes";
import { filterCommandPaletteItems } from "@/lib/command-palette-items";

describe("Story 39.1 desktop IA", () => {
  it("orders desktop rooms per DESIGN.md §3.1", () => {
    expect(adminNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Clients", "/clients"],
      ["Activities", "/activities"],
      ["Follow-up", "/follow-up"],
      ["Analytics", "/analytics"],
      ["Cohestra AI", "/ai"],
      ["Website", "/dashboard/website"],
      ["Campaigns", "/campaigns"],
    ]);
  });

  it("keeps Dashboard current only on /dashboard", () => {
    expect(isAdminNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isAdminNavItemActive("/dashboard/website", "/dashboard")).toBe(false);
  });

  it("marks Analytics current on /analytics and /reports", () => {
    expect(isAdminNavItemActive("/analytics", "/analytics")).toBe(true);
    expect(isAdminNavItemActive("/reports", "/analytics")).toBe(true);
    expect(isAnalyticsPath("/reports")).toBe(true);
  });

  it("marks Cohestra AI current on /ai and compatibility aliases", () => {
    expect(isAdminNavItemActive("/ai", "/ai")).toBe(true);
    expect(isAdminNavItemActive("/intelligence", "/ai")).toBe(true);
    expect(isAdminNavItemActive("/needs-attention", "/ai")).toBe(true);
    expect(isAiPath("/intelligence")).toBe(true);
  });

  it("uses Website Studio as the Website breadcrumb", () => {
    expect(getAdminBreadcrumbs("/dashboard/website")).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Website Studio" },
    ]);
  });

  it("keeps Settings crumbs on profile descendants and Team/Billing on path boundaries", () => {
    expect(getAdminBreadcrumbs("/settings/teammates")).toEqual([{ label: "Settings" }]);
    expect(getAdminBreadcrumbs("/settings/team")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Team" },
    ]);
    expect(getAdminBreadcrumbs("/settings/billing")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Billing" },
    ]);
    expect(getAdminBreadcrumbs("/settings/plan")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Plan & limits" },
    ]);
    expect(getAdminBreadcrumbs("/settings/profile")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Your account" },
    ]);
  });

  it("preserves query string on compatibility destinations", () => {
    expect(
      destinationWithSearch("/analytics", { preset: "weekly", from: "2026-01-01" })
    ).toBe("/analytics?preset=weekly&from=2026-01-01");
    expect(destinationWithSearch("/analytics", { preset: "" })).toBe("/analytics?preset=");
    expect(destinationWithSearch("/ai", { tag: ["a", "b"] })).toBe("/ai?tag=a&tag=b");
    expect(destinationWithSearch("/ai", {})).toBe("/ai");
  });

  it("treats /settings and /settings/profile as the Settings footer target", () => {
    expect(isSettingsProfilePath("/settings")).toBe(true);
    expect(isSettingsProfilePath("/settings/profile")).toBe(true);
    expect(isSettingsProfilePath("/settings/plan")).toBe(true);
    expect(isSettingsProfilePath("/settings/appearance")).toBe(true);
    expect(isSettingsProfilePath("/settings/team")).toBe(false);
    expect(isSettingsProfilePath("/settings/billing")).toBe(false);
    expect(isSettingsProfilePath("/settings/teammates")).toBe(true);
    expect(isSettingsProfilePath("/settings/billing-history")).toBe(true);
  });

  it("finds Analytics in the command palette via reports keyword", () => {
    const matches = filterCommandPaletteItems("reports");
    expect(matches.some((item) => item.href === "/analytics" && item.label === "Analytics")).toBe(
      true
    );
  });

  it("finds Website via Website Studio without renaming the nav label", () => {
    const matches = filterCommandPaletteItems("website studio");
    expect(
      matches.some((item) => item.href === "/dashboard/website" && item.label === "Website")
    ).toBe(true);
  });
});
