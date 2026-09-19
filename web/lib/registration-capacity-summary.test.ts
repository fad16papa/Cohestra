import { describe, expect, it } from "vitest";

import { buildRegistrationCapacitySummary } from "@/lib/registration-capacity-summary";

describe("buildRegistrationCapacitySummary", () => {
  it("hides when no cap and zero registrations", () => {
    expect(
      buildRegistrationCapacitySummary({
        registrationCount: 0,
        maxRegistrants: null,
      }).kind
    ).toBe("hidden");
  });

  it("shows going only when unlimited capacity", () => {
    const summary = buildRegistrationCapacitySummary({
      registrationCount: 34,
      maxRegistrants: null,
    });
    expect(summary).toMatchObject({ kind: "going-only", label: "34 going" });
  });

  it("shows spots remaining without going negative", () => {
    const summary = buildRegistrationCapacitySummary({
      registrationCount: 34,
      maxRegistrants: 42,
    });
    expect(summary).toMatchObject({
      kind: "spots",
      spotsRemaining: 8,
      goingLabel: "34 going",
      spotsLabel: "8 spots remaining",
    });
  });

  it("treats over-cap count as full without negative spots", () => {
    const summary = buildRegistrationCapacitySummary({
      registrationCount: 50,
      maxRegistrants: 42,
    });
    expect(summary.kind).toBe("full");
  });

  it("marks full when isRegistrationFull flag set", () => {
    const summary = buildRegistrationCapacitySummary({
      registrationCount: 10,
      maxRegistrants: 20,
      isRegistrationFull: true,
    });
    expect(summary.kind).toBe("full");
  });
});
