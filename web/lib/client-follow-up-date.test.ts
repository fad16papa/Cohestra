import { describe, expect, it } from "vitest";

import {
  addDaysToDateInputValue,
  shouldNudgeFollowUpDateAfterOutreach,
  toDateInputValue,
} from "@/lib/client-follow-up-date";

describe("toDateInputValue", () => {
  it("formats a UTC instant in the tenant timezone", () => {
    expect(
      toDateInputValue("2026-08-09T16:00:00.000Z", "Asia/Singapore")
    ).toBe("2026-08-10");
  });

  it("returns empty string for null", () => {
    expect(toDateInputValue(null, "UTC")).toBe("");
  });
});

describe("addDaysToDateInputValue", () => {
  it("adds calendar days from tenant-local today", () => {
    const from = new Date("2026-08-09T12:00:00.000Z");
    expect(addDaysToDateInputValue(3, "UTC", from)).toBe("2026-08-12");
  });

  it("rolls month boundaries using calendar math only", () => {
    const from = new Date("2026-08-30T12:00:00.000Z");
    expect(addDaysToDateInputValue(3, "UTC", from)).toBe("2026-09-02");
  });
});

describe("shouldNudgeFollowUpDateAfterOutreach", () => {
  it("nudges when no follow-up date is set", () => {
    expect(
      shouldNudgeFollowUpDateAfterOutreach(null, "contacted", "UTC")
    ).toBe(true);
  });

  it("does not nudge contacted when a future date exists", () => {
    expect(
      shouldNudgeFollowUpDateAfterOutreach(
        "2099-12-31T00:00:00.000Z",
        "contacted",
        "UTC"
      )
    ).toBe(false);
  });

  it("does not nudge awaiting reply when a future date exists", () => {
    expect(
      shouldNudgeFollowUpDateAfterOutreach(
        "2099-12-31T00:00:00.000Z",
        "awaiting_reply",
        "UTC"
      )
    ).toBe(false);
  });

  it("nudges awaiting reply when follow-up is due or overdue", () => {
    expect(
      shouldNudgeFollowUpDateAfterOutreach(
        "2020-01-01T00:00:00.000Z",
        "awaiting_reply",
        "UTC"
      )
    ).toBe(true);
  });
});
