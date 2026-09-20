"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import {
  RegistrationPreviewChrome,
  type RegistrationPreviewFormStatus,
} from "@/components/registration/registration-preview-chrome";
import { RegistrationPreviewViewportToggle } from "@/components/registration/registration-preview-viewport-toggle";
import {
  persistRegistrationPreviewViewport,
  readStoredRegistrationPreviewViewport,
  registrationPreviewSurfaceMaxWidthClass,
  type RegistrationPreviewViewport,
} from "@/lib/registration-preview-viewport";
import type { ActivityFormSchema, RegistrationThemePreset } from "@/lib/activities-api";
import {
  compositionHasPresentationBlocks,
  CONVERSATIONAL_PRESENTATION_NOTICE,
} from "@/lib/form-composition-presentation";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";
import type { ResolvedRegistrationPreviewTheme } from "@/lib/registration-preview-theme";
import { cn } from "@/lib/utils";

type RegistrationPublicPreviewShellProps = {
  slug: string;
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  formSchema: ActivityFormSchema | null;
  formStatus: RegistrationPreviewFormStatus;
  theme: ResolvedRegistrationPreviewTheme;
  publicPageHref?: string | null;
  scrollClassName?: string;
  className?: string;
  websiteLink?: PublisherWebsiteLink | null;
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
  /** Remounts the public tree only — viewport chrome stays mounted. */
  remountKey?: string;
};

export function RegistrationPublicPreviewShell({
  slug,
  name,
  schedule,
  location,
  communityLabel,
  formSchema,
  formStatus,
  theme,
  publicPageHref = null,
  scrollClassName = "max-h-[min(36rem,70dvh)]",
  className,
  websiteLink = null,
  registrationCount = null,
  maxRegistrants = null,
  isRegistrationFull = false,
  remountKey = "preview",
}: RegistrationPublicPreviewShellProps) {
  const [viewport, setViewport] = useState<RegistrationPreviewViewport>(() =>
    readStoredRegistrationPreviewViewport(
      typeof window === "undefined" ? null : window.sessionStorage
    )
  );
  const showConversationalPresentationNotice =
    theme.resolvedExperience.flow === "conversational" &&
    formSchema != null &&
    compositionHasPresentationBlocks(formSchema.fields, formSchema.composition);

  useEffect(() => {
    persistRegistrationPreviewViewport(
      typeof window === "undefined" ? null : window.sessionStorage,
      viewport
    );
  }, [viewport]);

  return (
    <div className={cn("space-y-3", className)} data-preview-viewport={viewport}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {publicPageHref ? (
          <a
            href={publicPageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted-warm transition-colors hover:text-text-warm"
          >
            Open public page
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        ) : null}
        <RegistrationPreviewViewportToggle
          value={viewport}
          onChange={(next) => {
            persistRegistrationPreviewViewport(
              typeof window === "undefined" ? null : window.sessionStorage,
              next
            );
            setViewport(next);
          }}
        />
      </div>
      {showConversationalPresentationNotice ? (
        <div
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          {CONVERSATIONAL_PRESENTATION_NOTICE}
        </div>
      ) : null}
      <RegistrationPreviewChrome
        formStatus={formStatus}
        className={cn(
          "mx-auto w-full",
          registrationPreviewSurfaceMaxWidthClass(
            viewport,
            theme.resolvedExperience.layout
          )
        )}
        scrollClassName={scrollClassName}
      >
        <PublicRegistrationOpen
          key={remountKey}
          slug={slug}
          name={name}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          heroImageUrl={theme.heroImageUrl}
          accentColor={theme.accentColor}
          logoAssetId={theme.logoAssetId}
          preset={theme.preset as RegistrationThemePreset}
          resolvedExperience={theme.resolvedExperience}
          resolvedDesignTokens={theme.resolvedDesignTokens}
          formSchema={formSchema}
          websiteLink={websiteLink}
          variant="preview"
          registrationCount={registrationCount}
          maxRegistrants={maxRegistrants}
          isRegistrationFull={isRegistrationFull}
        />
      </RegistrationPreviewChrome>
    </div>
  );
}
