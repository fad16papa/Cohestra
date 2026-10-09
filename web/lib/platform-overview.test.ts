import { describe, expect, it } from "vitest";

import {
  freshnessLabel,
  isFakeHealthCopy,
  observedLabel,
  sumCounts,
} from "@/lib/platform-overview";

describe("platform overview provenance", () => {
  it("labels canonical freshness vocabulary", () => {
    expect(freshnessLabel("actual")).toBe("Actual");
    expect(freshnessLabel("missing_instrumentation")).toBe("Missing instrumentation");
    expect(freshnessLabel("unavailable")).toBe("Unavailable");
    expect(freshnessLabel("stale")).toBe("Stale");
  });

  it("treats recent observedAt as just now", () => {
    expect(observedLabel(new Date().toISOString())).toBe("Observed just now");
  });

  it("sums named counts including zero", () => {
    expect(sumCounts([])).toBe(0);
    expect(sumCounts([{ key: "Active", count: 2 }, { key: "Suspended", count: 0 }])).toBe(2);
  });

  it("rejects fake health copy", () => {
    expect(isFakeHealthCopy("Instrumentation not available yet.")).toBe(false);
    expect(isFakeHealthCopy("Healthy")).toBe(true);
    expect(isFakeHealthCopy("100% operational")).toBe(true);
  });
});
