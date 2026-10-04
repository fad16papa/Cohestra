import { describe, expect, it } from "vitest";

import {
  CONTINUITY_MAX_LENGTH,
  activityHrefForId,
  appendContinuityContext,
  buildContinuityCrumbs,
  clientHrefForId,
  hrefForContinuityContext,
  mobileBackAction,
  normalizeInternalReturnPath,
  parseContinuityContext,
  serializeContinuityContext,
  withClientVia,
} from "@/lib/continuity-context";
import { commandPaletteItems, filterCommandPaletteItems } from "@/lib/command-palette-items";
import { adminRouteTransitionKey } from "@/lib/admin-route-motion";
import { DASHBOARD_ONBOARDING_STEPS } from "@/lib/dashboard-onboarding";

describe("parseContinuityContext", () => {
  it("parses dashboard, follow-up, clients, activities, and activity tokens", () => {
    expect(parseContinuityContext("d:graphs")).toEqual({ room: "dashboard", view: "graphs" });
    expect(parseContinuityContext("fu:opportunity:3")).toEqual({
      room: "follow-up",
      category: "opportunity",
      page: 3,
    });
    expect(parseContinuityContext("cl:search=ada&page=2&sortBy=name")).toEqual({
      room: "clients",
      query: "search=ada&page=2&sortBy=name",
    });
    expect(parseContinuityContext("al:page=2&status=published")).toEqual({
      room: "activities",
      query: "page=2&status=published",
    });
    expect(
      parseContinuityContext("ac:11111111-1111-1111-1111-111111111111:form")
    ).toEqual({
      room: "activity",
      activityId: "11111111-1111-1111-1111-111111111111",
      tab: "form",
    });
  });

  it("preserves a via client id and drops unknown query keys", () => {
    const parsed = parseContinuityContext(
      "cl:search=ada&evil=1&page=2~c:22222222-2222-2222-2222-222222222222"
    );
    expect(parsed).toEqual({
      room: "clients",
      query: "search=ada&page=2",
      clientId: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("strips email-like filter values without discarding the typed token", () => {
    expect(
      parseContinuityContext("cl:search=ada@example.com&leadStatus=active&sortBy=name")
    ).toEqual({
      room: "clients",
      query: "leadStatus=active&sortBy=name",
    });
  });

  it("round-trips an empty clients token and keeps sibling filters when one value is external", () => {
    expect(parseContinuityContext("cl:")).toEqual({ room: "clients", query: "" });
    expect(
      parseContinuityContext("cl:search=https://evil.test&leadStatus=active&page=2")
    ).toEqual({
      room: "clients",
      query: "leadStatus=active&page=2",
    });
  });

  it("rejects absolute, protocol-relative, encoded, malformed, and oversized tokens", () => {
    expect(parseContinuityContext("https://evil.test")).toBeNull();
    expect(parseContinuityContext("//evil.test")).toBeNull();
    expect(parseContinuityContext("fu:%2f%2fevil.test")).toBeNull();
    expect(parseContinuityContext("javascript:alert(1)")).toBeNull();
    expect(parseContinuityContext("data:text/html,hi")).toBeNull();
    expect(parseContinuityContext("fu:not-a-category")).toBeNull();
    expect(parseContinuityContext("ac:not-a-uuid")).toBeNull();
    expect(parseContinuityContext("d:graphs" + "x".repeat(CONTINUITY_MAX_LENGTH))).toBeNull();
    expect(parseContinuityContext("")).toBeNull();
  });
});

describe("normalizeInternalReturnPath", () => {
  it("accepts application-internal relative paths", () => {
    expect(normalizeInternalReturnPath("/follow-up?category=opportunity")).toBe(
      "/follow-up?category=opportunity"
    );
    expect(normalizeInternalReturnPath("/clients?search=ada")).toBe("/clients?search=ada");
  });

  it("rejects unsafe destinations", () => {
    expect(normalizeInternalReturnPath("https://example.com")).toBeNull();
    expect(normalizeInternalReturnPath("//example.com")).toBeNull();
    expect(normalizeInternalReturnPath("/%2f%2fexample.com")).toBeNull();
    expect(normalizeInternalReturnPath("javascript:alert(1)")).toBeNull();
    expect(normalizeInternalReturnPath("data:text/html,x")).toBeNull();
    expect(normalizeInternalReturnPath("/login?next=https://evil.test")).toBeNull();
    expect(normalizeInternalReturnPath("not-a-path")).toBeNull();
    expect(normalizeInternalReturnPath(`/${"a".repeat(600)}`)).toBeNull();
  });
});

describe("serialize and href reconstruction", () => {
  it("round-trips typed context without concatenation of untrusted hrefs", () => {
    const followUp = { room: "follow-up" as const, category: "due-now" as const, page: 2 };
    expect(parseContinuityContext(serializeContinuityContext(followUp))).toEqual(followUp);
    expect(hrefForContinuityContext(followUp)).toBe("/follow-up?page=2");
    expect(hrefForContinuityContext({ room: "follow-up", category: "due-now", page: 1 })).toBe(
      "/follow-up"
    );
    expect(hrefForContinuityContext({ room: "dashboard", view: "table" })).toBe(
      "/dashboard?view=table"
    );
  });

  it("appends ctx and builds client/activity hrefs only for real ids", () => {
    const ctx = { room: "follow-up" as const, category: "at-risk" as const, page: 1 };
    expect(clientHrefForId("33333333-3333-3333-3333-333333333333", ctx)).toBe(
      "/clients/33333333-3333-3333-3333-333333333333?ctx=fu%3Aat-risk"
    );
    expect(activityHrefForId("not-an-id", ctx)).toBeNull();
    expect(
      activityHrefForId("44444444-4444-4444-4444-444444444444", withClientVia(ctx, "33333333-3333-3333-3333-333333333333"))
    ).toBe(
      "/activities/44444444-4444-4444-4444-444444444444?ctx=fu%3Aat-risk%7Ec%3A33333333-3333-3333-3333-333333333333"
    );
    expect(appendContinuityContext("/clients/x", null)).toBe("/clients/x");
  });
});

describe("breadcrumb and mobile Back", () => {
  it("builds origin → current crumbs and a named mobile Back", () => {
    const search = "ctx=fu%3Adue-now%3A2";
    expect(
      buildContinuityCrumbs({
        pathname: "/clients/33333333-3333-3333-3333-333333333333",
        search,
        currentLabel: "Ada",
      })
    ).toEqual([
      { label: "Follow-up", href: "/follow-up?page=2" },
      { label: "Ada", current: true },
    ]);
    expect(
      mobileBackAction({
        pathname: "/clients/33333333-3333-3333-3333-333333333333",
        search,
      })
    ).toEqual({ href: "/follow-up?page=2", label: "Back to Follow-up" });
  });

  it("falls back to the canonical parent when ctx is missing or invalid", () => {
    expect(
      mobileBackAction({ pathname: "/clients/33333333-3333-3333-3333-333333333333", search: "ctx=https://evil" })
    ).toEqual({ href: "/clients", label: "Back to Clients" });
    expect(
      buildContinuityCrumbs({
        pathname: "/activities/44444444-4444-4444-4444-444444444444",
        search: "",
        currentLabel: "Yoga",
      })
    ).toEqual([
      { label: "Activities", href: "/activities" },
      { label: "Yoga", current: true },
    ]);
  });
});

describe("command palette canonical rooms", () => {
  it("exposes canonical destinations and does not add legacy rooms as primary hrefs", () => {
    const labels = Object.fromEntries(commandPaletteItems.map((item) => [item.label, item.href]));
    expect(labels["Follow-up"]).toBe("/follow-up");
    expect(labels.Analytics).toBe("/analytics");
    expect(labels["Cohestra AI"]).toBe("/ai");
    expect(labels.Website).toBe("/dashboard/website");
    expect(labels.Campaigns).toBe("/campaigns");
    expect(labels.Clients).toBe("/clients");
    expect(labels.Activities).toBe("/activities");
    expect(commandPaletteItems.some((item) => item.href === "/reports")).toBe(false);
    expect(commandPaletteItems.some((item) => item.href === "/intelligence")).toBe(false);
    expect(commandPaletteItems.some((item) => item.label === "Opportunities")).toBe(false);
    expect(filterCommandPaletteItems("reports").some((item) => item.label === "Analytics")).toBe(true);
  });
});

describe("onboarding canonical rooms", () => {
  it("points first follow-up at Follow-up, not a Clients filter", () => {
    const step = DASHBOARD_ONBOARDING_STEPS.find((item) => item.id === "first-follow-up");
    expect(step?.href).toBe("/follow-up");
    expect(DASHBOARD_ONBOARDING_STEPS.every((item) => item.href !== "/reports")).toBe(true);
  });
});

describe("query-only motion key", () => {
  it("stays pathname-only when ctx or view changes", () => {
    expect(adminRouteTransitionKey("/follow-up?category=opportunity&page=2")).toBe("/follow-up");
    expect(adminRouteTransitionKey("/clients/1?ctx=fu:due-now")).toBe("/clients/1");
    expect(adminRouteTransitionKey("/dashboard?view=graphs")).toBe("/dashboard");
  });
});
