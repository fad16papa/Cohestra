import { describe, expect, it } from "vitest";

import { autoBucketField, applyMissingStepBuckets, usedFormSteps } from "@/lib/form-steps";

describe("form steps", () => {
  it("buckets name phone email to identity and consent to consent", () => {
    expect(
      autoBucketField({
        id: "full_name",
        type: "text",
        label: "Name",
        required: true,
        placeholder: null,
        options: null,
        consentText: null,
      })
    ).toBe("identity");
    expect(
      autoBucketField({
        id: "consent",
        type: "consent",
        label: "Consent",
        required: true,
        placeholder: null,
        options: null,
        consentText: "ok",
      })
    ).toBe("consent");
    expect(
      autoBucketField({
        id: "notes",
        type: "text",
        label: "Notes",
        required: false,
        placeholder: null,
        options: null,
        consentText: null,
      })
    ).toBe("details");
  });

  it("fills missing buckets only when the toggle is on", () => {
    const next = applyMissingStepBuckets({
      version: 1,
      meta: { introMarkdown: null, splitIntoSteps: true },
      fields: [
        {
          id: "email",
          type: "email",
          label: "Email",
          required: true,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
    });

    expect(next.fields[0]?.step).toBe("identity");
  });

  it("omits Hidden-only steps when includeHidden is false", () => {
    const fields = [
      {
        id: "email",
        type: "email" as const,
        label: "Email",
        required: true,
        placeholder: null,
        options: null,
        consentText: null,
        step: "identity" as const,
      },
      {
        id: "ref",
        type: "hidden" as const,
        label: "Campaign ref",
        required: false,
        placeholder: null,
        options: null,
        consentText: null,
        step: "details" as const,
      },
    ];

    expect(usedFormSteps(fields)).toEqual(["identity", "details"]);
    expect(usedFormSteps(fields, { includeHidden: false })).toEqual(["identity"]);
  });
});
