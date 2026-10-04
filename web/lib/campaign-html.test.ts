import { describe, expect, it } from "vitest";

import {
  campaignResultSummary,
  campaignStatusLabel,
  isAllowedCampaignImageSrc,
  isCampaignInFlight,
  isSafeCampaignHref,
  sanitizeCampaignHtml,
} from "./campaign-html";

describe("sanitizeCampaignHtml", () => {
  it("strips scripts, handlers, and unsafe destinations", () => {
    const dirty = `
      <p>Hello <script>alert(1)</script><img src=x onerror="alert(1)">
      <a href="javascript:alert(1)">bad</a>
      <a href="https://example.com">ok</a>
      <img src="https://tenant.test/api/v1/public/campaign-assets/abc" alt="QR">
    `;

    const clean = sanitizeCampaignHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('href="https://example.com"');
    expect(clean).toContain("/api/v1/public/campaign-assets/abc");
    expect(clean).toContain("Hello");
  });

  it("drops encoded external and data image sources", () => {
    expect(
      sanitizeCampaignHtml(
        '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">'
      )
    ).toBe("");
    expect(
      sanitizeCampaignHtml('<img src="https://evil.test/api/v1/public/not-assets/x">')
    ).toBe("");
    expect(isAllowedCampaignImageSrc("https://evil.test/other.png")).toBe(false);
    expect(
      isAllowedCampaignImageSrc("//evil.test/api/v1/public/campaign-assets/1")
    ).toBe(false);
    expect(
      isAllowedCampaignImageSrc("https://ok.test/api/v1/public/campaign-assets/1")
    ).toBe(true);
  });

  it("rejects unsafe hrefs fail-closed", () => {
    expect(isSafeCampaignHref("javascript:alert(1)")).toBe(false);
    expect(isSafeCampaignHref("data:text/html,hi")).toBe(false);
    expect(isSafeCampaignHref("//evil.test")).toBe(false);
    expect(isSafeCampaignHref("https://cohestra.test/r")).toBe(true);
    expect(isSafeCampaignHref("mailto:ops@example.com")).toBe(true);
  });
});

describe("campaign status copy", () => {
  it("keeps queued from looking like success", () => {
    expect(campaignStatusLabel("queued")).toBe("Queued");
    expect(isCampaignInFlight("sending")).toBe(true);
    expect(
      campaignResultSummary({
        sentCount: 0,
        failedCount: 0,
        skippedCount: 2,
        status: "queued",
      })
    ).toContain("not a completed send");
    expect(
      campaignResultSummary({
        sentCount: 3,
        failedCount: 1,
        skippedCount: 1,
        status: "completed",
      })
    ).toContain("Partial result");
  });
});
