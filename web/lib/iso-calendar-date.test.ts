import { describe, expect, it } from "vitest";

import { isIsoCalendarDate } from "@/lib/iso-calendar-date";

describe("isIsoCalendarDate", () => {
  it("accepts a valid calendar date", () => {
    expect(isIsoCalendarDate("2026-09-12")).toBe(true);
  });

  it("rejects impossible calendar days and non-ISO strings", () => {
    expect(isIsoCalendarDate("2026-02-30")).toBe(false);
    expect(isIsoCalendarDate("not-a-date")).toBe(false);
    expect(isIsoCalendarDate("2026-9-12")).toBe(false);
  });
});
