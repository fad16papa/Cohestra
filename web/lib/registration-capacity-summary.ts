export type RegistrationCapacitySummary =
  | { kind: "hidden" }
  | { kind: "going-only"; going: number; label: string }
  | { kind: "spots"; going: number; spotsRemaining: number; goingLabel: string; spotsLabel: string }
  | { kind: "full"; going: number; label: string };

function safeCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

/** Builds human-readable capacity copy from public Activity fields (never negative spots). */
export function buildRegistrationCapacitySummary(input: {
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
}): RegistrationCapacitySummary {
  const going = safeCount(input.registrationCount);
  const max = input.maxRegistrants;
  const hasCap =
    typeof max === "number" && Number.isFinite(max) && max > 0;
  const cap = hasCap ? Math.floor(max) : null;

  if (!hasCap) {
    if (going <= 0) {
      return { kind: "hidden" };
    }

    return {
      kind: "going-only",
      going,
      label: going === 1 ? "1 going" : `${going} going`,
    };
  }

  const effectiveGoing = cap !== null && going > cap ? cap : going;
  const spotsRemaining =
    cap !== null ? Math.max(0, cap - effectiveGoing) : 0;
  const full =
    input.isRegistrationFull === true ||
    spotsRemaining === 0 ||
    (cap !== null && going >= cap);

  if (full) {
    return {
      kind: "full",
      going: effectiveGoing,
      label:
        effectiveGoing === 1
          ? "1 going · Capacity reached"
          : `${effectiveGoing} going · Capacity reached`,
    };
  }

  if (going <= 0 && spotsRemaining > 0) {
    return {
      kind: "spots",
      going: 0,
      spotsRemaining,
      goingLabel: "Be the first to register",
      spotsLabel:
        spotsRemaining === 1
          ? "1 spot remaining"
          : `${spotsRemaining} spots remaining`,
    };
  }

  return {
    kind: "spots",
    going: effectiveGoing,
    spotsRemaining,
    goingLabel: effectiveGoing === 1 ? "1 going" : `${effectiveGoing} going`,
    spotsLabel:
      spotsRemaining === 1
        ? "1 spot remaining"
        : `${spotsRemaining} spots remaining`,
  };
}
