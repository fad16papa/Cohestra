import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertDemoClubInvariants,
  FORBIDDEN_ORG_PATTERN,
  getFollowUpClient,
  getReportsProofClients,
  isDemoRoomAvailable,
  marketingDemoClub,
  parseMarketingDemoClub,
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
    for (const room of ["clients", "outreach", "dashboard", "campaigns", "reports", "website"] as const) {
      expect(isDemoRoomAvailable(room)).toBe(true);
    }
  });
});
