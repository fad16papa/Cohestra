import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(resolve(import.meta.dirname, relative), "utf8");
}

describe("Story 41.3 source contracts", () => {
  it("keeps list status as visible text and uses the shared entitlement resolver", () => {
    const list = source("../components/campaigns/campaigns-list-page.tsx");
    expect(list).toContain("resolveCampaignRoomAccess");
    expect(list).toContain("campaignStatusLabel");
    expect(list).toContain("sent ·");
    expect(list).toContain("ProductErrorState");
    expect(list).not.toContain("CampaignDeliveredIcon");
    expect(list).not.toContain("!isProPlan");
  });

  it("blocks duplicate send and uses 38.6 confirmation copy", () => {
    const compose = source("../components/campaigns/campaign-compose-page.tsx");
    expect(compose).toContain("sendingRef");
    expect(compose).toContain("testingRef");
    expect(compose).toContain("isAuthoritativeReadyCount");
    expect(compose).toContain("isCampaignInFlight(sendResult?.status)");
    expect(compose).toContain("Sending cannot be undone.");
    expect(compose).toContain("beforeunload");
    expect(compose).toContain("<AlertDialog");
    expect(compose).toContain("disabled={!canSend}");
    expect(compose).not.toContain("autosave");
  });

  it("sanitizes preview and detail HTML", () => {
    const preview = source("../components/campaigns/email-preview-dialog.tsx");
    const detail = source("../components/campaigns/campaign-detail-page.tsx");
    expect(preview).toContain("sanitizeCampaignHtml");
    expect(detail).toContain("sanitizeCampaignHtml");
    expect(detail).toContain("isCampaignInFlight");
    expect(preview).toContain("Recipients with consent and email will receive");
  });
});
