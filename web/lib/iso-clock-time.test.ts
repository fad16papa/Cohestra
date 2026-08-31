import { describe, expect, it } from "vitest";

import { isIsoClockTime } from "@/lib/iso-clock-time";

describe("isIsoClockTime", () => {
  it("accepts HH:mm", () => {
    expect(isIsoClockTime("09:30")).toBe(true);
    expect(isIsoClockTime("23:59")).toBe(true);
  });

  it("rejects invalid clock times", () => {
    expect(isIsoClockTime("25:00")).toBe(false);
    expect(isIsoClockTime("9:30")).toBe(false);
    expect(isIsoClockTime("not-a-time")).toBe(false);
  });
});
