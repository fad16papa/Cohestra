import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const HEADER = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-header.tsx"),
  "utf8"
);
const OPS = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/ops/page.tsx"),
  "utf8"
);
const DIRECTORY = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/page.tsx"),
  "utf8"
);
const OVERVIEW = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/overview/page.tsx"),
  "utf8"
);
const BANNER = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-directory-health-banner.tsx"),
  "utf8"
);

describe("Story 44.3 Platform operations source contract", () => {
  it("adds Operations nav without Audits and without redirecting directory", () => {
    expect(HEADER).toContain('href: "/platform/ops"');
    expect(HEADER).toContain('label: "Operations"');
    expect(HEADER).not.toContain("Audits");
    expect(DIRECTORY).not.toContain('router.replace("/platform/ops")');
    expect(OVERVIEW).not.toContain('router.replace("/platform/ops")');
  });

  it("renders Operations health without fake SLA or later-story queries", () => {
    expect(OPS).toContain("<h1");
    expect(OPS).toContain("Operations");
    expect(OPS).toContain("getPlatformOpsHealth");
    expect(OPS).toContain("Not measured here");
    expect(OPS).toContain("Missing instrumentation");
    expect(OPS).toContain("Billing / Paddle");
    expect(OPS).toContain("Outbox");
    expect(OPS).not.toContain("outbox_messages");
    expect(OPS).not.toContain("paddle_webhook");
    expect(OPS).not.toContain("setInterval");
    expect(OPS).not.toContain("uptime");
    expect(OPS).not.toContain("SLA");
    expect(OPS).toContain("break-words");
    expect(OPS).toContain("/ready");
  });

  it("keeps directory usable when health fails and banners only on measured non-healthy", () => {
    expect(DIRECTORY).toContain("PlatformDirectoryHealthBanner");
    expect(DIRECTORY).toContain("getPlatformOpsHealth");
    expect(DIRECTORY).toContain("listPlatformTenants");
    expect(BANNER).toContain("shouldShowDegradedBanner");
    expect(BANNER).toContain("/ready");
    expect(BANNER).toContain("outbox");
    expect(BANNER).toContain("Paddle");
    expect(BANNER).toContain("email");
    expect(BANNER).toContain("Infrastructure health is unavailable");
    expect(BANNER).toContain('role="alert"');
    expect(OVERVIEW).toContain("Unavailable");
    expect(OVERVIEW).toContain("does not prove");
  });
});
