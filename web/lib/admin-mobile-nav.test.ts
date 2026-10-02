/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import { moreSheetNavItems, mobileTabItems, isMoreDestinationPath } from "@/lib/admin-mobile-nav";
import { adminNavItems } from "@/lib/admin-nav";

describe("Story 39.2 mobile IA", () => {
  it("orders five tabs Home, Clients, Activities, Follow-up, More", () => {
    expect(mobileTabItems.map((item) => [item.label, item.href ?? "sheet"])).toEqual([
      ["Home", "/dashboard"],
      ["Clients", "/clients"],
      ["Activities", "/activities"],
      ["Follow-up", "/follow-up"],
      ["More", "sheet"],
    ]);
    expect(mobileTabItems).toHaveLength(5);
  });

  it("keeps Home current only on /dashboard", () => {
    const home = mobileTabItems[0];
    expect(home.isActive("/dashboard")).toBe(true);
    expect(home.isActive("/dashboard/website")).toBe(false);
  });

  it("marks Follow-up current on /follow-up and More on Website", () => {
    const followUp = mobileTabItems.find((item) => item.key === "follow-up");
    const more = mobileTabItems.find((item) => item.key === "more");
    expect(followUp?.isActive("/follow-up")).toBe(true);
    expect(more?.isActive("/follow-up")).toBe(false);
    expect(more?.isActive("/dashboard/website")).toBe(true);
    expect(isMoreDestinationPath("/analytics")).toBe(true);
    expect(isMoreDestinationPath("/reports")).toBe(true);
    expect(isMoreDestinationPath("/ai")).toBe(true);
    expect(isMoreDestinationPath("/intelligence")).toBe(true);
    expect(isMoreDestinationPath("/campaigns")).toBe(true);
    expect(isMoreDestinationPath("/settings/profile")).toBe(true);
    expect(isMoreDestinationPath("/settings/team")).toBe(true);
    expect(isMoreDestinationPath("/clients")).toBe(false);
    expect(isMoreDestinationPath("/activities")).toBe(false);
  });

  it("lists only More destinations, not primary-tab rooms", () => {
    expect(moreSheetNavItems().map((item) => item.label)).toEqual([
      "Analytics",
      "Cohestra AI",
      "Website",
      "Campaigns",
    ]);
    expect(adminNavItems.map((item) => item.label).slice(0, 4)).toEqual([
      "Dashboard",
      "Clients",
      "Activities",
      "Follow-up",
    ]);
  });
});
