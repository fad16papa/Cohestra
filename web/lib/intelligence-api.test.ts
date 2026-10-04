import { describe, expect, it } from "vitest";

import {
  intelligenceModeLabel,
  isSafeAdminHref,
  parseIntelligenceBrief,
  presentIntelligenceMode,
} from "@/lib/intelligence-api";

const validBrief = {
  generatedAt: "2026-09-05T08:00:00.000Z",
  timeZoneId: "UTC",
  mode: "deterministic",
  insights: [
    {
      id: "follow-up-due",
      kind: "follow_up_due",
      priority: 1,
      title: "1 person is due for follow-up",
      whyItMatters: "A next-follow-up date is already set.",
      whatChanged: null,
      evidence: [
        { label: "People due", value: "1", href: "/clients?followUpDue=true" },
        { label: "Due person", value: "Ada", href: "/clients?followUpDue=true" },
      ],
      recommendedAction: {
        label: "Open due follow-ups",
        href: "/clients?followUpDue=true",
      },
    },
  ],
  insufficientData: { isInsufficient: false, message: "" },
};

describe("isSafeAdminHref", () => {
  it("accepts allowlisted admin paths including reports compatibility", () => {
    expect(isSafeAdminHref("/clients?followUpDue=true")).toBe(true);
    expect(isSafeAdminHref("/activities/11111111-1111-1111-1111-111111111111")).toBe(
      true
    );
    expect(isSafeAdminHref("/follow-up")).toBe(true);
    expect(isSafeAdminHref("/analytics?preset=weekly")).toBe(true);
    expect(isSafeAdminHref("/dashboard?view=graphs")).toBe(true);
    expect(isSafeAdminHref("/reports")).toBe(true);
    expect(isSafeAdminHref("/ai")).toBe(true);
  });

  it("rejects protocol-relative, absolute, encoded, and script URLs", () => {
    expect(isSafeAdminHref("//evil.test/phish")).toBe(false);
    expect(isSafeAdminHref("https://evil.test")).toBe(false);
    expect(isSafeAdminHref("javascript:alert(1)")).toBe(false);
    expect(isSafeAdminHref("data:text/html,hi")).toBe(false);
    expect(isSafeAdminHref("vbscript:msg")).toBe(false);
    expect(isSafeAdminHref("/%2f%2fevil.test")).toBe(false);
    expect(isSafeAdminHref("/\\evil.test")).toBe(false);
    expect(isSafeAdminHref("/clients/../login")).toBe(false);
  });

  it("rejects public, platform, and unauthorized routes", () => {
    expect(isSafeAdminHref("/login")).toBe(false);
    expect(isSafeAdminHref("/register")).toBe(false);
    expect(isSafeAdminHref("/r/harbourline")).toBe(false);
    expect(isSafeAdminHref("/operator")).toBe(false);
    expect(isSafeAdminHref("/settings/billing")).toBe(false);
    expect(isSafeAdminHref("/campaigns")).toBe(false);
  });
});

describe("parseIntelligenceBrief", () => {
  it("parses a deterministic brief", () => {
    const brief = parseIntelligenceBrief(validBrief);
    expect(brief.mode).toBe("deterministic");
    expect(brief.insights).toHaveLength(1);
    expect(brief.insights[0]?.recommendedAction.href).toBe(
      "/clients?followUpDue=true"
    );
    expect(brief.insufficientData.isInsufficient).toBe(false);
  });

  it("parses PascalCase payloads", () => {
    const brief = parseIntelligenceBrief({
      GeneratedAt: validBrief.generatedAt,
      TimeZoneId: validBrief.timeZoneId,
      Mode: validBrief.mode,
      Insights: [
        {
          Id: "merge-suspects",
          Kind: "merge_suspects",
          Priority: 4,
          Title: "1 possible duplicate needs a look",
          WhyItMatters: "Registration matching flagged this record.",
          WhatChanged: null,
          Evidence: [{ Label: "Merge suspects", Value: "1", Href: "/clients?mergeSuspect=true" }],
          RecommendedAction: {
            Label: "Open merge suspects",
            Href: "/clients?mergeSuspect=true",
          },
        },
      ],
      InsufficientData: { IsInsufficient: false, Message: "" },
    });

    expect(brief.insights[0]?.kind).toBe("merge_suspects");
  });

  it("neutralizes an unsafe recommended action without dropping the brief", () => {
    const brief = parseIntelligenceBrief({
      ...validBrief,
      insights: [
        {
          ...validBrief.insights[0],
          recommendedAction: {
            label: "Leave the product",
            href: "https://evil.test",
          },
        },
      ],
    });

    expect(brief.insights).toHaveLength(1);
    expect(brief.insights[0]?.title).toBe("1 person is due for follow-up");
    expect(brief.insights[0]?.recommendedAction.href).toBeNull();
    expect(brief.insights[0]?.recommendedAction.label).toBe("Leave the product");
  });

  it("keeps insufficient-data messages without inventing insights", () => {
    const brief = parseIntelligenceBrief({
      ...validBrief,
      insights: [],
      insufficientData: {
        isInsufficient: true,
        message: "Not enough operational data yet.",
      },
    });

    expect(brief.insights).toEqual([]);
    expect(brief.insufficientData.isInsufficient).toBe(true);
    expect(brief.insufficientData.message).toContain("Not enough operational data");
  });

  it("rejects a payload missing required insight fields", () => {
    expect(() =>
      parseIntelligenceBrief({
        ...validBrief,
        insights: [{ title: "nope" }],
      })
    ).toThrow(/Invalid intelligence brief/);
  });
});

describe("intelligence mode presentation", () => {
  it("labels deterministic and synthesized truthfully", () => {
    expect(presentIntelligenceMode("deterministic")).toBe("deterministic");
    expect(presentIntelligenceMode("synthesized")).toBe("synthesized");
    expect(presentIntelligenceMode("oracle")).toBe("deterministic");
    expect(intelligenceModeLabel("deterministic")).toMatch(/workspace rules/);
    expect(intelligenceModeLabel("synthesized")).toMatch(/Synthesized from the same grounded facts/);
    expect(intelligenceModeLabel("mystery")).not.toMatch(/Synthesized/);
  });
});
