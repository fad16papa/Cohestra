import { describe, expect, it } from "vitest";

import {
  closeAtDateTimeLocalToUtcIso,
  formatCloseAtPreview,
  toCloseAtDateTimeLocal,
} from "@/lib/registration-close-at";

describe("registration-close-at", () => {
  it("round-trips UTC through tenant-local datetime-local", () => {
    const iso = "2026-09-01T02:00:00.000Z";
    const local = toCloseAtDateTimeLocal(iso, "Asia/Singapore");
    expect(local).toBe("2026-09-01T10:00");
    expect(closeAtDateTimeLocalToUtcIso(local, "Asia/Singapore")).toBe(iso);
  });

  it("formats preview without timezone jargon", () => {
    const preview = formatCloseAtPreview("2026-09-01T02:00:00.000Z", "Asia/Singapore");
    expect(preview).toContain("2026");
    expect(preview?.toLowerCase()).not.toContain("utc");
  });

  it("returns null when datetime-local is cleared", () => {
    expect(closeAtDateTimeLocalToUtcIso("", "UTC")).toBeNull();
  });
});
