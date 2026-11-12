import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function expectRoomPageHeaders(filePath: string) {
  const file = source(filePath);
  const pageHeaderMatches = file.match(/<PageHeader[\s\S]*?\/>/g) ?? [];

  expect(pageHeaderMatches.length).toBeGreaterThan(0);
  for (const snippet of pageHeaderMatches) {
    expect(snippet).toContain('variant="room"');
  }
  expect(file).not.toContain("text-display-sm");
}

describe("Story F ops chrome", () => {
  it("campaign room pages use room PageHeader variant", () => {
    expectRoomPageHeaders("components/campaigns/campaign-room-gate.tsx");
    expectRoomPageHeaders("components/campaigns/campaigns-list-page.tsx");
  });

  it("analytics and settings room headers use room variant", () => {
    expectRoomPageHeaders("components/reports/reports-page-client.tsx");
    expectRoomPageHeaders("components/settings/settings-page-header.tsx");
  });

  it("keeps campaign Pro gate and analytics Core gate with export", () => {
    expect(source("components/campaigns/campaign-room-gate.tsx")).toContain(
      'requiredPlan="Pro"'
    );
    expect(source("components/reports/reports-page-client.tsx")).toContain(
      'requiredPlan="Core"'
    );
    expect(source("components/reports/reports-page-client.tsx")).toContain("Export CSV");
  });

  it("keeps notifications save label and campaign row height", () => {
    expect(source("components/settings/notifications-section.tsx")).toContain(
      "Save notifications"
    );
    expect(source("components/campaigns/campaigns-list-page.tsx")).toContain(
      "min-h-[52px]"
    );
  });

  it("toast dismiss control stays reachable at 44px", () => {
    const toast = source("components/ui/toast-provider.tsx");

    expect(toast).toContain('aria-label="Dismiss notification"');
    expect(toast).toContain("min-h-11 min-w-11");
    expect(toast).toContain("rounded-[16px]");
  });
});
