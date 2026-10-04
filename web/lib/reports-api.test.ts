import { describe, expect, it } from "vitest";

import {
  exportDisabledReason,
  filtersFromSearchParams,
  filtersToSearchParams,
} from "@/lib/reports-api";

describe("filtersFromSearchParams", () => {
  it("defaults unknown presets to weekly and drops invalid lead status", () => {
    const parsed = filtersFromSearchParams(
      new URLSearchParams("preset=not-a-preset&leadStatus=vip&community=Harbour")
    );
    expect(parsed.preset).toBe("weekly");
    expect(parsed.leadStatus).toBe("");
    expect(parsed.community).toBe("Harbour");
  });

  it("round-trips supported report query keys", () => {
    const parsed = filtersFromSearchParams(
      new URLSearchParams(
        "preset=custom&from=2026-01-01&to=2026-01-31&activityId=11111111-1111-1111-1111-111111111111&leadStatus=new"
      )
    );
    expect(filtersToSearchParams(parsed).toString()).toBe(
      "preset=custom&from=2026-01-01&to=2026-01-31&activityId=11111111-1111-1111-1111-111111111111&leadStatus=new"
    );
  });
});

describe("exportDisabledReason", () => {
  it("names empty, stale, error, and incomplete custom ranges", () => {
    expect(
      exportDisabledReason({
        awaitingCustomDates: true,
        isReportStale: false,
        error: null,
        registrations: 4,
        isExporting: false,
      })
    ).toBe("Select both dates to export.");
    expect(
      exportDisabledReason({
        awaitingCustomDates: false,
        isReportStale: true,
        error: null,
        registrations: 4,
        isExporting: false,
      })
    ).toBe("Wait for the report to finish updating.");
    expect(
      exportDisabledReason({
        awaitingCustomDates: false,
        isReportStale: false,
        error: "boom",
        registrations: 4,
        isExporting: false,
      })
    ).toBe("Export is unavailable while the report cannot load.");
    expect(
      exportDisabledReason({
        awaitingCustomDates: false,
        isReportStale: false,
        error: null,
        registrations: 0,
        isExporting: false,
      })
    ).toBe("Export is unavailable because this period has no registrations.");
    expect(
      exportDisabledReason({
        awaitingCustomDates: false,
        isReportStale: false,
        error: null,
        registrations: 3,
        isExporting: false,
      })
    ).toBeNull();
  });
});
