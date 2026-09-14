import { describe, expect, it } from "vitest";

import {
  activityScheduleToDateTimeLocal,
  buildScheduleUpdatePayload,
  isSameScheduleDateTimeLocal,
} from "@/lib/activity-schedule-edit";

describe("activityScheduleToDateTimeLocal", () => {
  it("prefers scheduledStartsAt when present", () => {
    const value = activityScheduleToDateTimeLocal({
      schedule: "Sat, 19 Sept 2026, 10:00 am",
      scheduledStartsAt: "2026-09-19T02:00:00.000Z",
    });

    expect(value).toMatch(/^2026-09-19T/);
  });

  it("builds storage payload from datetime-local", () => {
    const payload = buildScheduleUpdatePayload("2026-09-19T10:00");
    expect(payload.schedule).toContain("2026");
    expect(payload.scheduledStartsAt).toContain("2026");
  });

  it("detects unchanged schedule", () => {
    const activity = {
      schedule: "Sat, 19 Sept 2026, 10:00 am",
      scheduledStartsAt: "2026-09-19T02:00:00.000Z",
    };
    const local = activityScheduleToDateTimeLocal(activity);
    expect(isSameScheduleDateTimeLocal(activity, local)).toBe(true);
    expect(isSameScheduleDateTimeLocal(activity, "2026-12-01T09:00")).toBe(false);
  });
});
