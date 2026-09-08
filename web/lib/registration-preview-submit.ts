import type { ActivityFormSchema } from "@/lib/activities-api";
import type { PublicRegistrationSubmitResult } from "@/lib/public-registration-api";
import { substitutePipingAnswers } from "@/lib/registration-piping";

export const PREVIEW_REGISTRATION_NUMBER = "PREVIEW-0000";

/** Studio preview only — never calls the public registration API. */
export async function simulateRegistrationPreviewSubmit(
  schema: ActivityFormSchema,
  answers: Record<string, unknown>
): Promise<PublicRegistrationSubmitResult> {
  const successCopyMarkdown = substitutePipingAnswers(
    schema.meta?.successCopyMarkdown ?? null,
    schema,
    answers
  );

  const confirmationEmail = extractEmailAnswer(schema, answers);

  return {
    status: "preview",
    message: "Preview submission — no registration was created.",
    registrationId: "00000000-0000-0000-0000-000000000000",
    registrationNumber: PREVIEW_REGISTRATION_NUMBER,
    clientId: "00000000-0000-0000-0000-000000000000",
    confirmationEmailSent: false,
    confirmationEmail,
    successCopyMarkdown: successCopyMarkdown || null,
  };
}

function extractEmailAnswer(
  schema: ActivityFormSchema,
  answers: Record<string, unknown>
): string | null {
  const emailField = schema.fields.find((field) => field.type === "email");
  if (!emailField) {
    const direct = answers.email ?? answers.Email;
    return typeof direct === "string" && direct.trim() ? direct.trim() : null;
  }

  const value = answers[emailField.id];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
