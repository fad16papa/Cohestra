import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ANCHOR_IDS,
  assertDemoClubInvariants,
  canRecommendWhatsApp,
  countNeedAttention,
  DEMO_ORG_NAME,
  FORBIDDEN_ORG_PATTERN,
  formatDemoWhatsappDay,
  getFollowUpClient,
  getGoldenHourSpots,
  getIntelligenceBriefs,
  getReportsProofClients,
  getTriageBucket,
  isDemoRoomAvailable,
  listClientsByTriage,
  marketingDemoClub,
  parseMarketingDemoClub,
  REQUIRED_DEMO_ROOMS,
} from "./marketing-demo-club";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "marketing-demo-club.json");

describe("MarketingDemoClub Harbourline continuous seed (33.6)", () => {
  it("loads Harbourline org with frozen Singapore clock", () => {
    expect(marketingDemoClub.orgName).toBe(DEMO_ORG_NAME);
    expect(marketingDemoClub.publicHost).toBe("harbourline-social.cohestra.app");
    expect(marketingDemoClub.clock.timeZoneId).toBe("Asia/Singapore");
    expect(marketingDemoClub.clock.demoNow).toBe("2026-09-07T09:00:00+08:00");
    expect(() => assertDemoClubInvariants(marketingDemoClub)).not.toThrow();
  });

  it("locks five anchors and ≥25 visible clients", () => {
    const names = marketingDemoClub.clients.map((client) => client.fullName);
    expect(names).toEqual(
      expect.arrayContaining([
        "Maya Santos",
        "Daniel Koh",
        "Priya Nair",
        "Marcus Ong",
        "Sarah Tan",
      ])
    );
    expect(marketingDemoClub.clients.length).toBeGreaterThanOrEqual(25);
  });

  it("derives Golden Hour 34 going · 8 spots left from fixtures", () => {
    const spots = getGoldenHourSpots(marketingDemoClub);
    expect(spots).toEqual({ going: 34, capacity: 42, spotsLeft: 8 });
  });

  it("derives needsAttention 6+7+4=17 without a stored flag", () => {
    const source = readFileSync(fixturePath, "utf8");
    expect(source).not.toMatch(/"needsAttention"\s*:/);
    const attention = countNeedAttention(marketingDemoClub);
    expect(attention).toEqual({ dueNow: 6, atRisk: 7, opportunity: 4, total: 17 });
  });

  it("keeps Marcus out of attention and blocks WhatsApp", () => {
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.marcus)).toBe("healthy");
    expect(canRecommendWhatsApp(marketingDemoClub, ANCHOR_IDS.marcus)).toBe(false);
    expect(marketingDemoClub.clientDetails[ANCHOR_IDS.marcus]?.phone).toBeNull();
  });

  it("assigns Anchor triage jobs", () => {
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.maya)).toBe("dueNow");
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.daniel)).toBe("atRisk");
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.priya)).toBe("opportunity");
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.sarah)).toBe("healthy");
  });

  it("reverse-chains Maya Instagram → Golden Hour → dueNow", () => {
    const detail = marketingDemoClub.clientDetails[ANCHOR_IDS.maya]!;
    expect(detail.referralSource).toMatch(/Instagram/i);
    expect(detail.registrationHistory.some((r) => r.activityId === "demo-golden-hour-run")).toBe(
      true
    );
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.maya)).toBe("dueNow");
  });

  it("reverse-chains Daniel quiet history → atRisk", () => {
    const detail = marketingDemoClub.clientDetails[ANCHOR_IDS.daniel]!;
    expect(detail.registrationHistory.length).toBeGreaterThanOrEqual(2);
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.daniel)).toBe("atRisk");
  });

  it("reverse-chains Priya referral repeats → opportunity", () => {
    const detail = marketingDemoClub.clientDetails[ANCHOR_IDS.priya]!;
    expect(detail.referralSource).toMatch(/Referral/i);
    expect(detail.registrationHistory.length).toBeGreaterThanOrEqual(2);
    expect(getTriageBucket(marketingDemoClub, ANCHOR_IDS.priya)).toBe("opportunity");
  });

  it("makes Maya the Follow-up subject with Golden Hour WhatsApp copy", () => {
    const maya = getFollowUpClient(marketingDemoClub);
    expect(maya.fullName).toBe("Maya Santos");
    expect(marketingDemoClub.whatsappQuote.body).toMatch(/Golden Hour/i);
    expect(marketingDemoClub.whatsappQuote.clientId).toBe(ANCHOR_IDS.maya);
  });

  it("rejects Acme org names", () => {
    expect(FORBIDDEN_ORG_PATTERN.test(marketingDemoClub.orgName)).toBe(false);
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, orgName: "Acme Club" }))
    ).toThrow(/orgName/i);
  });

  it("keeps all six house-tour rooms available", () => {
    expect([...REQUIRED_DEMO_ROOMS]).toEqual([
      "website",
      "clients",
      "activities",
      "outreach",
      "analytics",
      "intelligence",
    ]);
    for (const room of REQUIRED_DEMO_ROOMS) {
      expect(isDemoRoomAvailable(room)).toBe(true);
    }
  });

  it("lists triage queues that sum to needsAttention 17", () => {
    const due = listClientsByTriage(marketingDemoClub, "dueNow");
    const risk = listClientsByTriage(marketingDemoClub, "atRisk");
    const opp = listClientsByTriage(marketingDemoClub, "opportunity");
    expect(due).toHaveLength(6);
    expect(risk).toHaveLength(7);
    expect(opp).toHaveLength(4);
    expect(due.some((c) => c.id === ANCHOR_IDS.maya)).toBe(true);
    expect(risk.some((c) => c.id === ANCHOR_IDS.daniel)).toBe(true);
    expect(opp.some((c) => c.id === ANCHOR_IDS.priya)).toBe(true);
  });

  it("grounds Cohestra AI briefs in seed facts without invented percentages", () => {
    const briefs = getIntelligenceBriefs(marketingDemoClub);
    expect(briefs.length).toBeGreaterThanOrEqual(2);
    const blob = briefs.map((b) => `${b.title} ${b.why.join(" ")}`).join("\n");
    expect(blob).toMatch(/6 people need follow-up today|6 /);
    expect(blob).toMatch(/34 of 42|34 \/ 42|34 of 42 registered/);
    expect(blob).not.toMatch(/\d+%\s*(increase|improvement|lift|growth)/i);
    expect(blob).not.toMatch(/chatbot|I think|probably/i);
    for (const brief of briefs) {
      expect(brief.why.length).toBeGreaterThan(0);
      expect(brief.activityIds.length).toBeGreaterThan(0);
    }
  });

  it("formats WhatsApp day in Asia/Singapore", () => {
    expect(formatDemoWhatsappDay(marketingDemoClub.whatsappQuote.loggedAt)).toBe("Sep 6");
  });

  it("puts Maya in reports-derived proof clients", () => {
    const proof = getReportsProofClients(marketingDemoClub);
    expect(proof.map((client) => client.fullName)).toContain("Maya Santos");
  });

  it("aligns dashboard week to Sep 2026 and Golden Hour ranking", () => {
    expect(marketingDemoClub.reportFilters.from).toBe("2026-09-01");
    expect(marketingDemoClub.reportFilters.to).toBe("2026-09-07");
    expect(marketingDemoClub.dashboard.computedAt).toBe("2026-09-07T09:00:00+08:00");
    expect(
      marketingDemoClub.reports.activityRanking.some((row) =>
        row.activityName.toLowerCase().includes("golden hour")
      )
    ).toBe(true);
  });

  it("projects local /demo photography and footer on the Website room", () => {
    const hero = marketingDemoClub.website.published.sections.find(
      (section) => section.type === "hero"
    );
    expect(hero?.props.heroImageUrl).toBe("/demo/harbourline-hero.webp");
    expect(
      marketingDemoClub.website.published.sections.some(
        (section) => section.enabled && section.type === "footer"
      )
    ).toBe(true);
    expect(
      marketingDemoClub.website.upcomingActivities.every(
        (row) => typeof row.heroImageUrl === "string" && row.heroImageUrl.startsWith("/demo/")
      )
    ).toBe(true);
  });

  it("requires clientDetails for anchors and rejects empty campaigns / remote assets", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
    const details = { ...(raw.clientDetails as Record<string, unknown>) };
    delete details[ANCHOR_IDS.maya];
    expect(() =>
      assertDemoClubInvariants(parseMarketingDemoClub({ ...raw, clientDetails: details }))
    ).toThrow(/clientDetails\.demo-maya/i);

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
});
