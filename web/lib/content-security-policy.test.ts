import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildEmbedContentSecurityPolicy,
  nginxContentSecurityPolicyForEmbed,
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
      "frame-ancestors 'self' https://club.example.com https://www.notion.so"
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
