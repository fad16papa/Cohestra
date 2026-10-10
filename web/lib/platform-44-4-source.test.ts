import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { OUTBOX_MUTATION_LABELS } from "@/lib/platform-outbox";

const OPS = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/ops/page.tsx"),
  "utf8"
);
const OUTBOX = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-ops-outbox.tsx"),
  "utf8"
);
const HEALTH = readFileSync(
  resolve(import.meta.dirname, "../lib/platform-health.ts"),
  "utf8"
);

describe("Story 44.4 Operations outbox source contract", () => {
  it("activates Outbox on Operations without a new route or mutation controls", () => {
    expect(OPS).toContain("PlatformOpsOutboxSection");
    expect(OPS).toContain("/ready");
    expect(OPS).not.toContain('href: "/platform/ops/outbox"');
    expect(OUTBOX).toContain("getPlatformOpsOutboxSummary");
    expect(OUTBOX).toContain("getPlatformOpsOutboxList");
    expect(OUTBOX).toContain("NO_FAILED_OUTBOX_COPY");
    expect(OUTBOX).toContain("Loading outbox");
    expect(OUTBOX).toContain("Outbox data unavailable");
    expect(OUTBOX).toContain("pageSize: 25");
    expect(OUTBOX).toContain("PlatformDataTable");
    expect(OUTBOX).toContain("<h2");
    for (const label of OUTBOX_MUTATION_LABELS) {
      expect(OUTBOX).not.toContain(label);
      expect(OPS).not.toContain(label);
    }
  });

  it("does not treat zero Failed as health and leaves outbox read-only", () => {
    expect(OUTBOX).toContain("not email health");
    expect(OPS).toContain("PlatformOpsPaddleSection");
    expect(HEALTH).toContain("does not prove outbox");
    expect(OUTBOX).not.toContain("paddle_webhook");
    expect(OUTBOX).not.toContain("PayloadJson");
    expect(OUTBOX).not.toContain("payloadJson");
  });
});
