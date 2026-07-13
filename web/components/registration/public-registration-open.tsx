"use client";

import { useState, type CSSProperties } from "react";

import { ActivityHero } from "@/components/registration/activity-hero";
import { RegistrationForm } from "@/components/registration/registration-form";
import { RegistrationSuccessScreen } from "@/components/registration/registration-success-screen";
import type { ActivityFormSchema } from "@/lib/activities-api";
import { cn } from "@/lib/utils";

type PublicRegistrationOpenProps = {
  slug: string;
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  accentColor?: string | null;
  formSchema: ActivityFormSchema | null;
};

export function PublicRegistrationOpen({
  slug,
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  accentColor,
  formSchema,
}: PublicRegistrationOpenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const brandingStyle = accentColor
    ? ({ "--primary": accentColor } as CSSProperties)
    : undefined;

  return (
    <div className={cn("space-y-8")} style={brandingStyle}>
      <ActivityHero
        name={name}
        schedule={schedule}
        location={location}
        communityLabel={communityLabel}
        heroImageUrl={heroImageUrl}
        showHeroImage={!submitted}
      />

      {submitted && registrationNumber ? (
        <RegistrationSuccessScreen
          activityName={name}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          registrationNumber={registrationNumber}
          confirmationEmailSent={confirmationEmailSent}
          confirmationEmail={confirmationEmail}
          onRegisterAnother={() => {
            setRegistrationNumber(null);
            setConfirmationEmailSent(false);
            setConfirmationEmail(null);
            setSubmitted(false);
          }}
        />
      ) : formSchema ? (
        <RegistrationForm
          schema={formSchema}
          variant="public"
          activitySlug={slug}
          onSubmitted={(result) => {
            setRegistrationNumber(result.registrationNumber);
            setConfirmationEmailSent(result.confirmationEmailSent);
            setConfirmationEmail(result.confirmationEmail);
            setSubmitted(true);
          }}
        />
      ) : (
        <p className="text-center text-sm text-text-muted-warm">
          Registration form is not available yet.
        </p>
      )}
    </div>
  );
}
