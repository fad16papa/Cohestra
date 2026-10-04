import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const FILTER_BAR_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/reports/report-filter-bar.tsx"),
  "utf8"
);
const REPORTS_CLIENT_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/reports/reports-page-client.tsx"),
  "utf8"
);

describe("Analytics filter history contract", () => {
  it("pushes user filter changes so Back/Forward can restore query state", () => {
    expect(FILTER_BAR_SOURCE).toContain("router.push(analyticsHref(params.toString()))");
    expect(FILTER_BAR_SOURCE).toContain("applyFilters(defaultReportFilters())");
    expect(FILTER_BAR_SOURCE).not.toMatch(/router\.replace\(analyticsHref/);
    expect(FILTER_BAR_SOURCE).not.toMatch(/router\.replace\(ANALYTICS_PATH/);
  });

  it("keeps missing-query default injection on replace", () => {
    expect(REPORTS_CLIENT_SOURCE).toContain("ensureDefaultReportSearchParams");
    expect(REPORTS_CLIENT_SOURCE).toContain("router.replace(defaultPath)");
  });
});
