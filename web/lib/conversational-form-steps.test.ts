import { describe, expect, it } from "vitest";

import type { FormFieldDefinition } from "@/lib/activities-api";
import {
  clampConversationalStepIndex,
  isConversationalDisplayOnlyStep,
  listConversationalSteps,
} from "@/lib/conversational-form-steps";

const fields: FormFieldDefinition[] = [
  {
    id: "name",
    type: "text",
    label: "Name",
    required: true,
    options: null,
    placeholder: null,
    consentText: null,
  },
  {
    id: "info1",
    type: "info",
    label: "Note",
    required: false,
    options: null,
    placeholder: null,
    infoText: "Hello",
    consentText: null,
  },
  {
    id: "email",
    type: "email",
    label: "Email",
    required: false,
    options: null,
    placeholder: null,
    consentText: null,
  },
];

describe("conversational form steps", () => {
  it("lists visible fields in schema order", () => {
    const steps = listConversationalSteps(fields, {}, { includeHiddenPreview: false });
    expect(steps.map((f) => f.id)).toEqual(["name", "info1", "email"]);
  });

  it("marks info and section_header as display-only", () => {
    expect(isConversationalDisplayOnlyStep(fields[1]!)).toBe(true);
    expect(isConversationalDisplayOnlyStep(fields[0]!)).toBe(false);
  });

  it("clamps step index when fields are removed", () => {
    expect(clampConversationalStepIndex(5, 3)).toBe(2);
    expect(clampConversationalStepIndex(-1, 3)).toBe(0);
    expect(clampConversationalStepIndex(0, 0)).toBe(0);
  });
});
