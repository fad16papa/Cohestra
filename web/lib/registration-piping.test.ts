import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  isPipingEligibleField,
  listPipingFieldTokens,
  PIPING_SAMPLE_NAME,
  substitutePipingPreview,
} from "@/lib/registration-piping";

const schema: ActivityFormSchema = {
  version: 1,
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
    {
      id: "ref",
      type: "hidden",
      label: "Campaign ref",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    },
    {
      id: "notes",
      type: "textarea",
      label: "Notes",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    },
  ],
};

describe("registration-piping", () => {
  it("omits hidden fields from cheatsheet tokens", () => {
    expect(listPipingFieldTokens(schema)).toEqual([
      "{{field:full_name}}",
      "{{field:notes}}",
    ]);
  });

  it("substitutes sample name in preview", () => {
    expect(
      substitutePipingPreview("See you Saturday, {{full_name}}.", schema)
    ).toBe(`See you Saturday, ${PIPING_SAMPLE_NAME}.`);
  });

  it("returns empty for hidden field tokens in preview", () => {
    expect(substitutePipingPreview("Ref: {{field:ref}}", schema)).toBe("Ref: ");
  });

  it("marks hidden and info as ineligible", () => {
    expect(isPipingEligibleField(schema.fields[1])).toBe(false);
    expect(
      isPipingEligibleField({
        id: "info",
        type: "info",
        label: "Info",
        required: false,
        placeholder: null,
        options: null,
        consentText: null,
      })
    ).toBe(false);
  });

  it("returns empty for unknown tokens in preview", () => {
    expect(substitutePipingPreview("Hi {{foo}} there", schema)).toBe("Hi  there");
  });

  it("clears empty and unclosed tokens in preview", () => {
    expect(substitutePipingPreview("Hi {{}} there", schema)).toBe("Hi  there");
    expect(substitutePipingPreview("Hi {{full_name there", schema)).toBe("Hi ");
  });
});
