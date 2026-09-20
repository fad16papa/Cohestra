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

  it("changes when nested paragraph text changes inside a section", () => {
    const v2WithSection: ActivityFormSchema = {
      version: 2,
      fields: [
        {
          id: "field_a",
          type: "text",
          label: "A",
          required: true,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
      composition: [
        {
          id: "section-1",
          kind: "section",
          title: "About you",
          children: [
            {
              id: "heading-1",
              kind: "content",
              contentType: "heading",
              content: { text: "About you", level: 2 },
            },
            {
              id: "para-1",
              kind: "content",
              contentType: "paragraph",
              content: { text: "Original" },
            },
            { id: "ref-a", kind: "fieldRef", fieldId: "field_a" },
          ],
        },
      ],
    };
    const updatedParagraph: ActivityFormSchema = {
      ...v2WithSection,
      composition: [
        {
          ...v2WithSection.composition![0],
          children: v2WithSection.composition![0].children!.map((child) =>
            child.id === "para-1"
              ? {
                  ...child,
                  content: { text: "Updated" },
                }
              : child
          ),
        },
      ],
    };

    expect(buildFormStudioPreviewKey(v2WithSection)).not.toBe(
      buildFormStudioPreviewKey(updatedParagraph)
    );
  });

  it("changes when child order changes inside a section", () => {
    const sectionBase: ActivityFormSchema = {
      version: 2,
      fields: [
        {
          id: "field_a",
          type: "text",
          label: "A",
          required: true,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
      composition: [
        {
          id: "section-1",
          kind: "section",
          title: "Prefs",
          children: [
            {
              id: "heading-1",
              kind: "content",
              contentType: "heading",
              content: { text: "Prefs", level: 2 },
            },
            { id: "ref-a", kind: "fieldRef", fieldId: "field_a" },
            {
              id: "para-1",
              kind: "content",
              contentType: "paragraph",
              content: { text: "Note" },
            },
          ],
        },
      ],
    };
    const reorderedChildren: ActivityFormSchema = {
      ...sectionBase,
      composition: [
        {
          ...sectionBase.composition![0],
          children: [
            sectionBase.composition![0].children![0],
            sectionBase.composition![0].children![2],
            sectionBase.composition![0].children![1],
          ],
        },
      ],
    };

    expect(buildFormStudioPreviewKey(sectionBase)).not.toBe(
      buildFormStudioPreviewKey(reorderedChildren)
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
