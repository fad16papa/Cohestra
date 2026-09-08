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
});
