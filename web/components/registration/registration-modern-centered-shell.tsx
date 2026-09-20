"use client";

import type { CSSProperties, ReactNode } from "react";

import { RegistrationModernCenteredExperiencePanel } from "@/components/registration/registration-modern-centered-experience-panel";
import {
  modernCenteredStyleTokens,
  normalizeModernCenteredStyle,
  type ModernCenteredSurfaceStyle,
} from "@/lib/registration-center-style";
import type { RegistrationExperienceStyle } from "@/lib/registration-experience";
import { cn } from "@/lib/utils";

type RegistrationModernCenteredShellProps = {
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  logoAssetId?: string | null;
  accentColor?: string | null;
  showHeroImage?: boolean;
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
  experienceStyle: RegistrationExperienceStyle;
  brandingStyle?: CSSProperties;
  formSection: ReactNode;
  footer?: ReactNode;
};

export function RegistrationModernCenteredShell({
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  logoAssetId = null,
  accentColor = null,
  showHeroImage = true,
  registrationCount = null,
  maxRegistrants = null,
  isRegistrationFull = false,
  experienceStyle,
  brandingStyle,
  formSection,
  footer = null,
}: RegistrationModernCenteredShellProps) {
  const surfaceStyle: ModernCenteredSurfaceStyle =
    normalizeModernCenteredStyle(experienceStyle);
  const tokens = modernCenteredStyleTokens(surfaceStyle);

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-[720px] flex-col overflow-x-hidden",
        tokens.page
      )}
      style={brandingStyle}
      data-registration-shell="modern-centered"
      data-registration-style={surfaceStyle}
    >
      <RegistrationModernCenteredExperiencePanel
        name={name}
        schedule={schedule}
        location={location}
        communityLabel={communityLabel}
        heroImageUrl={heroImageUrl}
        logoAssetId={logoAssetId}
        accentColor={accentColor}
        showHeroImage={showHeroImage}
        registrationCount={registrationCount}
        maxRegistrants={maxRegistrants}
        isRegistrationFull={isRegistrationFull}
        surfaceStyle={surfaceStyle}
      />

      <div className={tokens.sectionDivider} role="presentation" />

      <section className={tokens.formSurface} aria-labelledby="registration-form-heading">
        <h2 id="registration-form-heading" className={tokens.formHeading}>
          Registration
        </h2>
        {formSection}
      </section>

      {footer}
    </div>
  );
}
