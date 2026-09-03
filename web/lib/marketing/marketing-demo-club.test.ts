import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertDemoClubInvariants,
  FORBIDDEN_ORG_PATTERN,
  formatDemoWhatsappDay,
  getFollowUpClient,
  getReportsProofClients,
  isDemoRoomAvailable,
  marketingDemoClub,
  parseMarketingDemoClub,
  REQUIRED_DEMO_ROOMS,
} from "./marketing-demo-club";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "marketing-demo-club.json");

describe("MarketingDemoClub", () => {
  it("loads a single static JSON module (no fetch)", () => {
    expect(marketingDemoClub.orgName).toBe("Riverside Rec");
    expect(marketingDemoClub.publicHost).toBe("riverside-rec.cohestra.app");
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "marketing-demo-club.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/document\.cookie/);
  });

  it("locks Elena, Jordan, Sunday clinic, and board games night", () => {
    const names = marketingDemoClub.clients.map((client) => client.fullName);
    expect(names).toContain("Elena Martinez");
    expect(names).toContain("Jordan Kim");

    const activityNames = marketingDemoClub.clients
      .map((client) => client.lastActivityName)
      .concat(marketingDemoClub.dashboard.activityPerformance.map((row) => row.activityName))
      .concat(marketingDemoClub.website.upcomingActivities.map((row) => row.name));

    expect(activityNames.some((name) => name?.toLowerCase().includes("sunday clinic"))).toBe(true);
    expect(activityNames.some((name) => name?.toLowerCase().includes("board games"))).toBe(true);
  });

  it("puts Elena in clients and reports-derived data", () => {
    const elena = marketingDemoClub.clients.find((client) => client.id === "demo-elena");
    expect(elena?.fullName).toBe("Elena Martinez");
    expect(elena?.nationality).toBe("Spain");
    expect(elena?.leadStatus).toBe("active");

    const proof = getReportsProofClients(marketingDemoClub);
    expect(proof.map((client) => client.fullName)).toContain("Elena Martinez");
    expect(proof.filter((client) => client.id === "demo-elena")).toHaveLength(1);
  });

  it("makes Jordan the Follow-up subject with Sunday clinic WhatsApp copy", () => {
    const jordan = getFollowUpClient(marketingDemoClub);
    expect(jordan.fullName).toBe("Jordan Kim");
    expect(jordan.leadStatus).toBe("contacted");
    expect(marketingDemoClub.whatsappQuote.body).toMatch(/Sunday clinic/i);
    expect(marketingDemoClub.whatsappQuote.body).toMatch(/Jordan/);
    expect(marketingDemoClub.whatsappQuote.clientId).toBe("demo-jordan");
  });

  it("rejects Acme / Your account / yourclub org names", () => {
    expect(FORBIDDEN_ORG_PATTERN.test(marketingDemoClub.orgName)).toBe(false);
    expect(() => assertDemoClubInvariants(marketingDemoClub)).not.toThrow();

    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, orgName: "Acme Club" }))
    ).toThrow(/orgName/i);
  });

  it("keeps all six rooms available (omit is an explicit flag, not a throw)", () => {
    for (const room of REQUIRED_DEMO_ROOMS) {
      expect(isDemoRoomAvailable(room)).toBe(true);
    }
  });

  it("requires clientDetails for selected, follow-up, and reports-proof clients", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    const details = { ...(raw.clientDetails as Record<string, unknown>) };
    delete details["demo-elena"];
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, clientDetails: details }))
    ).toThrow(/clientDetails\.demo-elena/i);
  });

  it("requires availableRooms to include every cinema room", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, availableRooms: [] }))
    ).toThrow(/availableRooms must include clients/i);
  });

  it("locks Elena's phone and one March club week across rooms", () => {
    const elena = marketingDemoClub.clients.find((client) => client.id === "demo-elena");
    expect(elena?.phone).toBe("+34 612 345 678");
    expect(marketingDemoClub.clientDetails["demo-elena"]?.phone).toBe("+34 612 345 678");

    expect(marketingDemoClub.reportFilters.from).toBe("2026-03-08");
    expect(marketingDemoClub.reportFilters.to).toBe("2026-03-15");
    expect(marketingDemoClub.dashboard.periodDays).toBe(8);
    expect(marketingDemoClub.dashboard.computedAt.startsWith("2026-03-15")).toBe(true);
    expect(marketingDemoClub.dashboard.newLeadsInPeriod).toBe(marketingDemoClub.reports.newLeads);
    expect(marketingDemoClub.reports.newLeads).toBe(12);
    expect(marketingDemoClub.reports.campaignResults.campaignsFailed).toBe(0);
    expect(marketingDemoClub.dashboard.activeActivitiesCount).toBe(3);
    expect(
      marketingDemoClub.website.upcomingActivities.find((row) =>
        row.name.toLowerCase().includes("board games")
      )?.schedule
    ).toMatch(/Sunday/i);

    const trendNew = marketingDemoClub.dashboard.registrationsTrend.reduce(
      (sum, point) => sum + point.newClients,
      0
    );
    expect(trendNew).toBe(12);
    expect(marketingDemoClub.dashboard.registrationsTrend[0]?.date).toBe("2026-03-08");
    const rankingRegs = marketingDemoClub.reports.activityRanking.reduce(
      (sum, row) => sum + row.registrationCount,
      0
    );
    expect(rankingRegs).toBe(marketingDemoClub.reports.registrations);

    const jordanTimeline = marketingDemoClub.clientDetails["demo-jordan"]?.timeline ?? [];
    expect(jordanTimeline[0]?.eventType).toBe("lead_status_changed");
    expect(jordanTimeline[1]?.eventType).toBe("whatsapp_follow_up_recorded");
  });

  it("requires dashboardQueueIds to resolve to clients", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    expect(() =>
      assertDemoClubInvariants(
        parseMarketingDemoClub({ ...raw, dashboardQueueIds: ["missing-client"] })
      )
    ).toThrow(/dashboardQueueId missing-client/i);
  });

  it("requires website section types to be enabled", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    const website = structuredClone(raw.website) as {
      published: { sections: Array<{ type: string; enabled: boolean }> };
    };
    const hero = website.published.sections.find((section) => section.type === "hero");
    if (hero) {
      hero.enabled = false;
    }
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, website }))
    ).toThrow(/enabled section type hero/i);
  });

  it("keeps board games highlight on Sunday and formats WhatsApp day from loggedAt", () => {
    const source = readFileSync(fixturePath, "utf8");
    expect(source).not.toMatch(/Friday tables/i);
    expect(source).toMatch(/Sunday tables/i);
    expect(formatDemoWhatsappDay(marketingDemoClub.whatsappQuote.loggedAt)).toBe("Mar 9");
  });

  it("rejects empty campaigns and remote website assets", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, campaigns: [] }))
    ).toThrow(/campaigns must not be empty/i);

    const website = structuredClone(raw.website) as {
      published: { logoAssetId: string | null };
    };
    website.published.logoAssetId = "asset-123";
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, website }))
    ).toThrow(/remote logoAssetId forbidden/i);
  });

  it("rejects heroImageAssetId, non-example emails, and hollow ranking/sections", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;

    const websiteWithHero = structuredClone(raw.website) as {
      published: { sections: Array<{ type: string; enabled: boolean; props: Record<string, unknown> }> };
    };
    const hero = websiteWithHero.published.sections.find((section) => section.type === "hero");
    if (hero) {
      hero.props.heroImageAssetId = "hero-asset";
    }
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, website: websiteWithHero }))
    ).toThrow(/remote heroImageAssetId forbidden/i);

    const clients = structuredClone(raw.clients) as Array<{ id: string; email: string }>;
    const elena = clients.find((client) => client.id === "demo-elena");
    if (elena) {
      elena.email = "elena@riverside.rec";
    }
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, clients }))
    ).toThrow(/@example\.com/i);

    const reports = structuredClone(raw.reports) as {
      activityRanking: Array<{ activityName: string }>;
    };
    for (const row of reports.activityRanking) {
      row.activityName = "yoga open mat";
    }
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, reports }))
    ).toThrow(/activityRanking missing locked activities/i);

    const websiteHollow = structuredClone(raw.website) as {
      published: {
        sections: Array<{ type: string; enabled: boolean; props: { items?: unknown[] } }>;
      };
    };
    const highlights = websiteHollow.published.sections.find(
      (section) => section.type === "highlights"
    );
    if (highlights) {
      highlights.props.items = [];
    }
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, website: websiteHollow }))
    ).toThrow(/highlights items empty/i);
  });
});
