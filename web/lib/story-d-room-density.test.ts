import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Story D room density", () => {
  it("page-header supports room variant and keeps display default", () => {
    const pageHeader = source("components/shared/page-header.tsx");

    expect(pageHeader).toContain(
      "text-[1.25rem] font-semibold leading-tight tracking-[-0.02em]"
    );
    expect(pageHeader).toContain("text-display-sm");
    expect(pageHeader).toContain('variant?: "display" | "room"');
  });

  it("room pages pass variant=room on PageHeader", () => {
    expect(source("components/dashboard/dashboard-greeting-header.tsx")).toContain(
      'variant="room"'
    );
    expect(source("components/activities/activities-list-page.tsx")).toContain(
      'variant="room"'
    );
    expect(source("components/clients/clients-list-page.tsx")).toContain(
      'variant="room"'
    );
    expect(source("components/clients/client-profile-header.tsx")).toContain(
      'variant="room"'
    );
  });

  it("metric tile uses Jakarta KPI styling without hover lift", () => {
    const metricTile = source("components/dashboard/metric-tile.tsx");

    expect(metricTile).not.toContain("text-display-sm");
    expect(metricTile).not.toContain("hover:-translate-y-px");
  });

  it("activity card title is identity typography without card shadow hover", () => {
    const activityCard = source("components/activities/activity-card.tsx");

    expect(activityCard).not.toMatch(/CardTitle className="[^"]*text-section/);
    expect(activityCard).not.toContain("hover:shadow-md");
  });

  it("clients table cells meet 52px row minimum", () => {
    const layout = source("components/clients/clients-table-layout.ts");

    expect(layout).toContain("min-h-[52px]");
  });

  it("dashboard page client uses 24px section gaps", () => {
    const dashboard = source("components/dashboard/dashboard-page-client.tsx");

    expect(dashboard).toContain("space-y-6");
    expect(dashboard).not.toContain("space-y-8");
  });
});
