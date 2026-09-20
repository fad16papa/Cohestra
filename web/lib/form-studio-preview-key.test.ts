import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import { buildFormStudioPreviewKey } from "@/lib/form-studio-preview-key";

const baseSchema: ActivityFormSchema = {
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
  ],
  meta: {
    introMarkdown: null,
  },
};

describe("buildFormStudioPreviewKey", () => {
  it("changes when a field label changes", () => {
    const saved = buildFormStudioPreviewKey(baseSchema);
    const draft = buildFormStudioPreviewKey({
      ...baseSchema,
      fields: [{ ...baseSchema.fields[0], label: "Legal name" }],
    });

    expect(saved).not.toBe(draft);
  });

  it("changes when intro copy changes", () => {
    const saved = buildFormStudioPreviewKey(baseSchema);
    const draft = buildFormStudioPreviewKey({
      ...baseSchema,
      meta: { introMarkdown: "Welcome!" },
    });

    expect(saved).not.toBe(draft);
  });

  it("is stable for identical schemas", () => {
    expect(buildFormStudioPreviewKey(baseSchema)).toBe(
      buildFormStudioPreviewKey(structuredClone(baseSchema))
    );
  });

  it("changes when experience flow changes", () => {
    const saved = buildFormStudioPreviewKey(baseSchema, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    });
    const conversational = buildFormStudioPreviewKey(baseSchema, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { flow: "conversational", layout: "centered" },
    });

    expect(saved).not.toBe(conversational);
  });

  it("changes when composition field order changes", () => {
    const v2Base: ActivityFormSchema = {
      version: 2,
      fields: [
        ...baseSchema.fields,
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
      composition: [
        { id: "ref-name", kind: "fieldRef", fieldId: "full_name" },
        { id: "ref-email", kind: "fieldRef", fieldId: "email" },
      ],
    };
    const reordered: ActivityFormSchema = {
      ...v2Base,
      composition: [
        { id: "ref-email", kind: "fieldRef", fieldId: "email" },
        { id: "ref-name", kind: "fieldRef", fieldId: "full_name" },
      ],
    };

    expect(buildFormStudioPreviewKey(v2Base)).not.toBe(
      buildFormStudioPreviewKey(reordered)
    );
  });

  it("does not change for draft edits outside preview-visible material", () => {
    const saved = buildFormStudioPreviewKey(baseSchema);
    const withClosedMessage = buildFormStudioPreviewKey({
      ...baseSchema,
      meta: {
        introMarkdown: null,
        closedMessage: "Registration is closed.",
        confirmationEmailSubject: "See you soon",
      },
    });

    expect(saved).toBe(withClosedMessage);
  });
});
