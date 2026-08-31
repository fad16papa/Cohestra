"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { ActivityHero } from "@/components/registration/activity-hero";
import { RegistrationForm } from "@/components/registration/registration-form";
import { RegistrationIntroCopy } from "@/components/registration/registration-intro-copy";
import { RegistrationSuccessScreen } from "@/components/registration/registration-success-screen";
import type { ActivityFormSchema, RegistrationThemePreset } from "@/lib/activities-api";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";
import { cn } from "@/lib/utils";

type PublicRegistrationOpenProps = {
  slug: string;
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  accentColor?: string | null;
  logoAssetId?: string | null;
  preset?: RegistrationThemePreset;
  formSchema: ActivityFormSchema | null;
  websiteLink?: PublisherWebsiteLink | null;
  variant?: "public" | "preview" | "embed";
};

function FormSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

export function PublicRegistrationOpen({
  slug,
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  accentColor,
  logoAssetId = null,
  preset = "classic",
  formSchema,
  websiteLink = null,
  variant = "public",
}: PublicRegistrationOpenProps) {
  const [submitted, setSubmitted] = useState(false);
  const isEmbed = variant === "embed";
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const brandingStyle = accentColor
    ? ({ "--primary": accentColor } as CSSProperties)
    : undefined;
  const introMarkdown = formSchema?.meta?.introMarkdown ?? null;

  const hero = (
    <ActivityHero
      name={name}
      schedule={schedule}
      location={location}
      communityLabel={communityLabel}
      heroImageUrl={heroImageUrl}
      logoAssetId={logoAssetId}
      preset={preset}
      showHeroImage={!submitted}
    />
  );

  const formBody =
    submitted && registrationNumber ? (
      <RegistrationSuccessScreen
        activityName={name}
        schedule={schedule}
        location={location}
        communityLabel={communityLabel}
        registrationNumber={registrationNumber}
        confirmationEmailSent={confirmationEmailSent}
        confirmationEmail={confirmationEmail}
        websiteLink={websiteLink}
        onRegisterAnother={() => {
          setRegistrationNumber(null);
          setConfirmationEmailSent(false);
          setConfirmationEmail(null);
          setSubmitted(false);
        }}
      />
    ) : formSchema ? (
      <>
        {introMarkdown ? (
          <RegistrationIntroCopy
            introMarkdown={introMarkdown}
            className="space-y-3 pb-2"
          />
        ) : null}
        <RegistrationForm
          schema={formSchema}
          variant={variant === "preview" ? "preview" : "public"}
          activitySlug={slug}
          onSubmitted={(result) => {
            setRegistrationNumber(result.registrationNumber);
            setConfirmationEmailSent(result.confirmationEmailSent);
            setConfirmationEmail(result.confirmationEmail);
            setSubmitted(true);
          }}
        />
      </>
    ) : (
      <p className="text-center text-sm text-text-muted-warm">
        Registration form is not available yet.
      </p>
    );

  if (preset === "card") {
    return (
      <div
        className={cn("rounded-xl bg-[var(--paper-warm,#f3f5f7)] p-4 sm:p-6")}
        style={brandingStyle}
      >
        <div className="mx-auto max-w-xl space-y-6">
          {hero}
          <FormSection className="rounded-xl border border-border-warm bg-card p-4 shadow-md sm:p-6">
            {formBody}
          </FormSection>
        </div>
      </div>
    );
  }

  if (preset === "immersive") {
    return (
      <div className={cn("space-y-0")} style={brandingStyle}>
        {hero}
        <FormSection className="-mt-6 rounded-t-2xl border border-border-warm bg-card px-4 pb-6 pt-8 shadow-lg sm:px-6">
          {formBody}
        </FormSection>
      </div>
    );
  }

  if (preset === "compact" || isEmbed) {
    return (
      <div className={cn("space-y-5")} style={brandingStyle}>
        {hero}
        <FormSection>{formBody}</FormSection>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8")} style={brandingStyle}>
      {hero}
      <FormSection>{formBody}</FormSection>
    </div>
  );
}
