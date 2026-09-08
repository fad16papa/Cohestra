import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  PREVIEW_REGISTRATION_NUMBER,
  simulateRegistrationPreviewSubmit,
} from "@/lib/registration-preview-submit";

const schema: ActivityFormSchema = {
  version: 1,
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: true,
    },
  ],
  meta: {
    successCopyMarkdown: "Thanks, {{full_name}} — see you soon!",
  },
};

describe("simulateRegistrationPreviewSubmit", () => {
  it("returns preview identifiers without calling the API", async () => {
    const result = await simulateRegistrationPreviewSubmit(schema, {
      full_name: "Francis",
      email: "francis@example.com",
    });

    expect(result.registrationNumber).toBe(PREVIEW_REGISTRATION_NUMBER);
    expect(result.status).toBe("preview");
    expect(result.confirmationEmailSent).toBe(false);
    expect(result.successCopyMarkdown).toBe("Thanks, Francis — see you soon!");
    expect(result.confirmationEmail).toBe("francis@example.com");
  });
});
