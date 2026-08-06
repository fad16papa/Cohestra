import { describe, expect, it } from "vitest";

import type { Activity } from "@/lib/activities-api";
import {
  activitiesScheduleOverlap,
  buildActivityScheduleConflictIndex,
  buildDayScheduleConflictMaps,
  countScheduleConflictPairs,
  dayKeyHasScheduleConflicts,
  DEFAULT_ACTIVITY_DURATION_MINUTES,
  findActivityConflictsForDay,
  formatActivityConflictMessage,
  formatConflictSummary,
  type CalendarActivity,
} from "@/lib/activity-calendar-utils";

function calendarActivity(
  id: string,
  schedule: Date | null,
  overrides: Partial<Activity> = {}
): CalendarActivity {
  return {
    id,
    name: `Activity ${id}`,
    slug: `activity-${id}`,
    category: "Social",
    schedule: schedule?.toISOString() ?? "",
    location: "Venue",
    communityLabel: "Community",
    heroImageUrl: null,
    accentColor: null,
    showOnHomepage: true,
    status: "published",
    formSchema: null,
    maxRegistrants: null,
    registrationCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    parsedSchedule: schedule,
    ...overrides,
  };
}

describe("activitiesScheduleOverlap", () => {
  it("detects overlap within default duration window", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 13, 30));

    expect(
      activitiesScheduleOverlap(first, second, DEFAULT_ACTIVITY_DURATION_MINUTES)
    ).toBe(true);
  });

  it("does not flag same-day events separated by more than duration", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 15, 0));

    expect(
      activitiesScheduleOverlap(first, second, DEFAULT_ACTIVITY_DURATION_MINUTES)
    ).toBe(false);
  });
});

describe("findActivityConflictsForDay", () => {
  it("returns bidirectional conflict entries for overlapping pair", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 13, 30));
    const third = calendarActivity("c", new Date(2026, 7, 13, 15, 0));

    const conflicts = findActivityConflictsForDay([first, second, third]);

    expect(conflicts.get("a")?.map((activity) => activity.id)).toEqual(["b"]);
    expect(conflicts.get("b")?.map((activity) => activity.id)).toEqual(["a"]);
    expect(conflicts.has("c")).toBe(false);
  });
});

describe("countScheduleConflictPairs", () => {
  it("counts conflict pairs instead of involved activities", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 13, 30));
    const conflicts = findActivityConflictsForDay([first, second]);

    expect(countScheduleConflictPairs(conflicts)).toBe(1);
    expect(formatConflictSummary(countScheduleConflictPairs(conflicts))).toBe(
      "1 scheduling conflict"
    );
  });
});

describe("buildActivityScheduleConflictIndex", () => {
  it("indexes conflicts across all scheduled days", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 13, 30));
    const third = calendarActivity("c", new Date(2026, 7, 20, 10, 0));

    const index = buildActivityScheduleConflictIndex([first, second, third]);

    expect(index.get("a")?.map((activity) => activity.id)).toEqual(["b"]);
    expect(index.get("b")?.map((activity) => activity.id)).toEqual(["a"]);
    expect(index.has("c")).toBe(false);
  });
});

describe("buildDayScheduleConflictMaps", () => {
  it("indexes conflicts by date key for calendar rendering", () => {
    const first = calendarActivity("a", new Date(2026, 7, 13, 13, 0));
    const second = calendarActivity("b", new Date(2026, 7, 13, 13, 30));
    const third = calendarActivity("c", new Date(2026, 7, 20, 10, 0));

    const maps = buildDayScheduleConflictMaps([first, second, third]);

    expect(dayKeyHasScheduleConflicts(maps, "2026-08-13")).toBe(true);
    expect(dayKeyHasScheduleConflicts(maps, "2026-08-20")).toBe(false);
    expect(maps.get("2026-08-13")?.get("a")?.map((activity) => activity.id)).toEqual([
      "b",
    ]);
  });
});

describe("formatActivityConflictMessage", () => {
  it("names a single conflicting activity", () => {
    expect(
      formatActivityConflictMessage([{ name: "Community Run" } as CalendarActivity])
    ).toBe("Conflicts with Community Run.");
  });
});
