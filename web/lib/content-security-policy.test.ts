import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildEmbedContentSecurityPolicy,
  contentSecurityPolicyProductionLiveValue,
  nginxContentSecurityPolicy,
  nginxContentSecurityPolicyForEmbed,
  nginxContentSecurityPolicyProductionLive,
} from "../content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("defaults frame-ancestors to none", () => {
    const policy = buildContentSecurityPolicy();
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("includes only listed origins in frame-ancestors", () => {
    const policy = buildContentSecurityPolicy({
      frameAncestors: ["https://club.example.com", "https://www.notion.so"],
    });

    expect(policy).toContain(
      "frame-ancestors https://club.example.com https://www.notion.so"
    );
    expect(policy).not.toContain("frame-ancestors 'none'");
  });
});

describe("buildEmbedContentSecurityPolicy", () => {
  it("returns none when origins empty", () => {
    const policy = buildEmbedContentSecurityPolicy([]);
    expect(policy).toContain("frame-ancestors 'none'");
  });
});

describe("nginxContentSecurityPolicyForEmbed", () => {
  it("stays in sync with buildContentSecurityPolicy", () => {
    const origins = ["https://club.example.com"];
    expect(nginxContentSecurityPolicyForEmbed(origins)).toBe(
      buildContentSecurityPolicy({ frameAncestors: origins })
    );
  });
});

describe("production live Paddle CSP", () => {
  it("allows live Paddle and does not require sandbox hosts", () => {
    expect(contentSecurityPolicyProductionLiveValue).toContain("https://cdn.paddle.com");
    expect(contentSecurityPolicyProductionLiveValue).toContain("https://buy.paddle.com");
    expect(contentSecurityPolicyProductionLiveValue).toContain("https://api.paddle.com");
    expect(contentSecurityPolicyProductionLiveValue).not.toContain("sandbox-cdn.paddle.com");
    expect(contentSecurityPolicyProductionLiveValue).not.toContain("sandbox-buy.paddle.com");
    expect(contentSecurityPolicyProductionLiveValue).not.toContain("sandbox-api.paddle.com");
    expect(nginxContentSecurityPolicyProductionLive).toBe(
      contentSecurityPolicyProductionLiveValue
    );
  });

  it("keeps shared nginx CSP able to allow live Paddle", () => {
    expect(nginxContentSecurityPolicy).toContain("https://cdn.paddle.com");
    expect(nginxContentSecurityPolicy).toContain("https://buy.paddle.com");
    expect(nginxContentSecurityPolicy).toContain("https://api.paddle.com");
  });
});
