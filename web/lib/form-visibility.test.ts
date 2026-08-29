import { describe, expect, it } from "vitest";

import type { FormFieldDefinition } from "@/lib/activities-api";
import {
  collectVisibleWhenIssues,
  isFieldVisible,
  normalizeComparableAnswer,
} from "@/lib/form-visibility";

const guest: FormFieldDefinition = {
  id: "guest_name",
  type: "text",
  label: "Guest name",
  required: true,
  placeholder: null,
  options: null,
  consentText: null,
  visibleWhen: { fieldId: "bringing_guest", equals: "yes" },
};

const controller: FormFieldDefinition = {
  id: "bringing_guest",
  type: "select",
  label: "Bringing a guest?",
  required: true,
  placeholder: null,
  options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  consentText: null,
};

describe("form visibility", () => {
  it("normalizes checkbox true to yes", () => {
    expect(normalizeComparableAnswer(true)).toBe("yes");
    expect(normalizeComparableAnswer("YES")).toBe("yes");
  });

  it("hides guest name when bringing guest is no", () => {
    expect(isFieldVisible(guest, { bringing_guest: "no" })).toBe(false);
    expect(isFieldVisible(guest, { bringing_guest: "yes" })).toBe(true);
  });

  it("rejects circular recipes", () => {
    const issues = collectVisibleWhenIssues([
      {
        ...controller,
        visibleWhen: { fieldId: "guest_name", equals: "yes" },
      },
      guest,
    ]);

    expect(issues.some((issue) => issue.includes("cycle"))).toBe(true);
  });
});
