"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { ActivityHero } from "@/components/registration/activity-hero";
import { RegistrationModernCenteredShell } from "@/components/registration/registration-modern-centered-shell";
import {
  normalizeModernCenteredStyle,
} from "@/lib/registration-center-style";
import { RegistrationPosterExperiencePanel } from "@/components/registration/registration-poster-experience-panel";
import { RegistrationSplitExperiencePanel } from "@/components/registration/registration-split-experience-panel";
import { RegistrationForm } from "@/components/registration/registration-form";
import { RegistrationIntroCopy } from "@/components/registration/registration-intro-copy";
import { RegistrationSuccessScreen } from "@/components/registration/registration-success-screen";
import type {
  ActivityFormSchema,
  RegistrationThemePreset,
  ResolvedRegistrationExperience,
} from "@/lib/activities-api";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";
import { PublisherWebsiteTextLink } from "@/components/registration/publisher-website-link";
import { simulateRegistrationPreviewSubmit } from "@/lib/registration-preview-submit";
import {
  resolveRegistrationExperience,
  type RegistrationThemeWithExperience,
} from "@/lib/registration-experience";
import type { RegistrationFormFlowMode } from "@/components/registration/registration-form";
import { pickRegistrationPublicShellKind } from "@/lib/registration-public-shell";
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
  resolvedExperience?: ResolvedRegistrationExperience | null;
  formSchema: ActivityFormSchema | null;
  websiteLink?: PublisherWebsiteLink | null;
  variant?: "public" | "preview" | "embed";
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
};

function FormSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full min-w-0", className)}>{children}</div>;
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
  resolvedExperience = null,
  formSchema,
  websiteLink = null,
  variant = "public",
  registrationCount = null,
  maxRegistrants = null,
  isRegistrationFull = false,
}: PublicRegistrationOpenProps) {
  const [submitted, setSubmitted] = useState(false);
  const isEmbed = variant === "embed";
  const isPreview = variant === "preview";
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [successCopyMarkdown, setSuccessCopyMarkdown] = useState<string | null>(null);
  const brandingStyle = accentColor
    ? ({ "--primary": accentColor } as CSSProperties)
    : undefined;
  const introMarkdown = formSchema?.meta?.introMarkdown ?? null;

  const themeForExperience: RegistrationThemeWithExperience = {
    preset,
    inheritCommunityBrand: true,
    accentColor: null,
    heroImageUrl: null,
    resolvedExperience:
      resolvedExperience as RegistrationThemeWithExperience["resolvedExperience"],
  };
  const effectiveExperience = resolveRegistrationExperience(themeForExperience);
  const registrationFlowMode: RegistrationFormFlowMode =
    effectiveExperience.flow === "conversational" ? "conversational" : "default";
  const formSchemaKey = formSchema?.fields.map((field) => field.id).join(",") ?? "";

  const shellKind = pickRegistrationPublicShellKind(
    preset,
    themeForExperience,
    isEmbed
  );

  const modernCenteredSurfaceStyle =
    shellKind === "modern-centered"
      ? normalizeModernCenteredStyle(effectiveExperience.style)
      : null;

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
        successCopyMarkdown={successCopyMarkdown}
        confirmationEmailSent={confirmationEmailSent}
        confirmationEmail={confirmationEmail}
        websiteLink={websiteLink}
        isSimulated={isPreview}
        onRegisterAnother={() => {
          setRegistrationNumber(null);
          setConfirmationEmailSent(false);
          setConfirmationEmail(null);
          setSuccessCopyMarkdown(null);
          setSubmitted(false);
        }}
      />
    ) : formSchema ? (
      <>
        {introMarkdown ? (
          <RegistrationIntroCopy
            introMarkdown={introMarkdown}
            className="space-y-3 pb-1"
          />
        ) : null}
        <RegistrationForm
          key={`${slug}-${registrationFlowMode}-${formSchemaKey}`}
          schema={formSchema}
          variant={isPreview ? "preview" : "public"}
          flowMode={registrationFlowMode}
          publicSurfaceStyle={modernCenteredSurfaceStyle ?? undefined}
          activitySlug={slug}
          onPreviewSubmit={
            isPreview
              ? (answers) => simulateRegistrationPreviewSubmit(formSchema, answers)
              : undefined
          }
          onSubmitted={(result) => {
            setRegistrationNumber(result.registrationNumber);
            setConfirmationEmailSent(result.confirmationEmailSent);
            setConfirmationEmail(result.confirmationEmail);
            setSuccessCopyMarkdown(result.successCopyMarkdown);
            setSubmitted(true);
          }}
        />
      </>
    ) : (
      <p className="text-center text-sm text-text-muted-warm">
        Registration form is not available yet.
      </p>
    );

  const registrationWebsiteFooter =
    (variant === "public" || variant === "preview") && websiteLink ? (
      <div className="border-t border-border-warm/70 pt-5 text-center">
        <PublisherWebsiteTextLink link={websiteLink} />
      </div>
    ) : null;

  const modernCenteredShell = (
    <RegistrationModernCenteredShell
      name={name}
      schedule={schedule}
      location={location}
      communityLabel={communityLabel}
      heroImageUrl={heroImageUrl}
      logoAssetId={logoAssetId}
      accentColor={accentColor}
      showHeroImage={!submitted}
      registrationCount={registrationCount}
      maxRegistrants={maxRegistrants}
      isRegistrationFull={isRegistrationFull}
      experienceStyle={effectiveExperience.style}
      brandingStyle={brandingStyle}
      formSection={<FormSection className="space-y-5">{formBody}</FormSection>}
      footer={registrationWebsiteFooter}
      showRegistrationHeading={!submitted}
    />
  );

  if (shellKind === "card") {
    return (
      <div
        className={cn(
          "min-w-0 overflow-x-hidden rounded-xl bg-[var(--paper-warm,#f3f5f7)] p-4 sm:p-6"
        )}
        style={brandingStyle}
      >
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-6">
          {hero}
          <FormSection className="rounded-xl border border-border-warm bg-card p-4 shadow-md sm:p-6">
            {formBody}
          </FormSection>
          {registrationWebsiteFooter}
        </div>
      </div>
    );
  }

  if (shellKind === "immersive") {
    return (
      <div className={cn("min-w-0 space-y-0 overflow-x-hidden")} style={brandingStyle}>
        {hero}
        <FormSection className="-mt-6 rounded-t-2xl border border-border-warm bg-card px-4 pb-6 pt-8 shadow-lg sm:px-6">
          {formBody}
          {registrationWebsiteFooter}
        </FormSection>
      </div>
    );
  }

  if (shellKind === "compact") {
    return (
      <div className={cn("min-w-0 space-y-5 overflow-x-hidden")} style={brandingStyle}>
        {hero}
        <FormSection>{formBody}</FormSection>
        {!isEmbed ? registrationWebsiteFooter : null}
      </div>
    );
  }

  if (shellKind === "event-poster") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-[480px] flex-col gap-6 overflow-x-hidden sm:gap-7"
        )}
        style={brandingStyle}
      >
        <RegistrationPosterExperiencePanel
          name={name}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          heroImageUrl={heroImageUrl}
          logoAssetId={logoAssetId}
          accentColor={accentColor}
          showHeroImage={!submitted}
          registrationCount={registrationCount}
          maxRegistrants={maxRegistrants}
          isRegistrationFull={isRegistrationFull}
        />
        <FormSection className="space-y-5 rounded-xl border border-border-warm/80 bg-card/50 px-4 py-5 sm:px-5">
          {formBody}
        </FormSection>
        {registrationWebsiteFooter}
      </div>
    );
  }

  if (shellKind === "split-event") {
    return (
      <div
        className={cn(
          "relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-hidden px-4 sm:px-5",
          "lg:px-6"
        )}
        style={brandingStyle}
      >
        <div
          className={cn(
            "mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 overflow-x-hidden",
            "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8"
          )}
        >
        <RegistrationSplitExperiencePanel
          name={name}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          heroImageUrl={heroImageUrl}
          logoAssetId={logoAssetId}
          showHeroImage={!submitted}
          registrationCount={registrationCount}
          maxRegistrants={maxRegistrants}
          isRegistrationFull={isRegistrationFull}
        />
        <div className="flex min-w-0 flex-col gap-5">
          <FormSection className="space-y-5">{formBody}</FormSection>
          {registrationWebsiteFooter}
        </div>
        </div>
      </div>
    );
  }

  return modernCenteredShell;
}
