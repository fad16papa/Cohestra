"use client";

import { useState } from "react";

import { RegistrationForm } from "@/components/registration/registration-form";
import { RegistrationIntroCopy } from "@/components/registration/registration-intro-copy";
import {
  RegistrationPreviewChrome,
  type RegistrationPreviewFormStatus,
} from "@/components/registration/registration-preview-chrome";
import { RegistrationSuccessScreen } from "@/components/registration/registration-success-screen";
import type { ActivityFormSchema } from "@/lib/activities-api";
import type { PublicRegistrationSubmitResult } from "@/lib/public-registration-api";
import { simulateRegistrationPreviewSubmit } from "@/lib/registration-preview-submit";

type RegistrationFormPreviewPaneProps = {
  schema: ActivityFormSchema;
  formStatus: RegistrationPreviewFormStatus;
  previewKey?: string | number;
  activityName: string;
  schedule: string;
  location: string;
  communityLabel: string;
  introMarkdown?: string | null;
  scrollClassName?: string;
};

export function RegistrationFormPreviewPane({
  schema,
  formStatus,
  previewKey,
  activityName,
  schedule,
  location,
  communityLabel,
  introMarkdown = null,
  scrollClassName = "max-h-[min(36rem,70dvh)]",
}: RegistrationFormPreviewPaneProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<PublicRegistrationSubmitResult | null>(null);

  function resetPreview() {
    setSubmitted(false);
    setSubmitResult(null);
  }

  async function handlePreviewSubmit(
    answers: Record<string, unknown>
  ): Promise<PublicRegistrationSubmitResult> {
    return simulateRegistrationPreviewSubmit(schema, answers);
  }

  return (
    <RegistrationPreviewChrome
      formStatus={formStatus}
      scrollClassName={scrollClassName}
    >
      {submitted && submitResult ? (
        <RegistrationSuccessScreen
          activityName={activityName}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          registrationNumber={submitResult.registrationNumber}
          successCopyMarkdown={submitResult.successCopyMarkdown}
          confirmationEmailSent={false}
          confirmationEmail={submitResult.confirmationEmail}
          isSimulated
          onRegisterAnother={resetPreview}
        />
      ) : (
        <>
          {introMarkdown ? (
            <RegistrationIntroCopy
              introMarkdown={introMarkdown}
              className="mb-4 space-y-3"
            />
          ) : null}
          <RegistrationForm
            key={previewKey}
            schema={schema}
            variant="preview"
            onPreviewSubmit={handlePreviewSubmit}
            onSubmitted={(result) => {
              setSubmitResult(result);
              setSubmitted(true);
            }}
          />
        </>
      )}
    </RegistrationPreviewChrome>
  );
}
