import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PADDLE_MUTATION_LABELS } from "@/lib/platform-paddle";

const OPS = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/ops/page.tsx"),
  "utf8"
);
const PADDLE = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-ops-paddle.tsx"),
  "utf8"
);
const HEALTH = readFileSync(resolve(import.meta.dirname, "../lib/platform-health.ts"), "utf8");

describe("Story 44.5 Operations billing source contract", () => {
  it("activates Billing on Operations without a new route or mutation controls", () => {
    expect(OPS).toContain("PlatformOpsPaddleSection");
    expect(OPS).not.toContain('href: "/platform/ops/billing"');
    expect(PADDLE).toContain("getPlatformOpsPaddleConfig");
    expect(PADDLE).toContain("getPlatformOpsPaddleDeliveries");
    expect(PADDLE).toContain("MISSING_INSTRUMENTATION_COPY");
    expect(PADDLE).toContain("Loading billing diagnostics");
    expect(PADDLE).toContain("Billing diagnostics unavailable");
    expect(PADDLE).toContain("pageSize: 25");
    expect(PADDLE).toContain("PlatformDataTable");
    expect(PADDLE).toContain("<h2");
    for (const label of PADDLE_MUTATION_LABELS) {
      expect(PADDLE).not.toContain(label);
      expect(OPS).not.toContain(label);
    }
  });

  it("does not treat empty diagnostics as health and keeps paddle not in probe", () => {
    expect(PADDLE).toContain("not a Paddle health check");
    expect(PADDLE).toContain("MISSING_INSTRUMENTATION_COPY");
    expect(PADDLE).not.toContain("Paddle is down");
    expect(PADDLE).not.toContain("Billing healthy");
    expect(PADDLE).not.toContain("payloadJson");
    expect(PADDLE).not.toContain("WebhookSecret");
    expect(HEALTH).toContain("not_in_probe");
  });
});
