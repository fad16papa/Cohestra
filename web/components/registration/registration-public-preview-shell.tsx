"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import {
  RegistrationPreviewChrome,
  type RegistrationPreviewFormStatus,
} from "@/components/registration/registration-preview-chrome";
import {
  RegistrationPreviewViewportToggle,
  type RegistrationPreviewViewport,
} from "@/components/registration/registration-preview-viewport-toggle";
import type { ActivityFormSchema, RegistrationThemePreset } from "@/lib/activities-api";
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
  previewKey?: string | number;
  publicPageHref?: string | null;
  scrollClassName?: string;
  className?: string;
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
  previewKey,
  publicPageHref = null,
  scrollClassName = "max-h-[min(36rem,70dvh)]",
  className,
}: RegistrationPublicPreviewShellProps) {
  const [viewport, setViewport] = useState<RegistrationPreviewViewport>("mobile");

  return (
    <div className={cn("space-y-3", className)}>
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
          onChange={setViewport}
        />
      </div>
      <RegistrationPreviewChrome
        formStatus={formStatus}
        className={cn(
          "mx-auto w-full",
          viewport === "mobile" ? "max-w-[375px]" : "max-w-3xl"
        )}
        scrollClassName={scrollClassName}
      >
        <PublicRegistrationOpen
          key={previewKey}
          slug={slug}
          name={name}
          schedule={schedule}
          location={location}
          communityLabel={communityLabel}
          heroImageUrl={theme.heroImageUrl}
          accentColor={theme.accentColor}
          logoAssetId={theme.logoAssetId}
          preset={theme.preset as RegistrationThemePreset}
          formSchema={formSchema}
          variant="preview"
        />
      </RegistrationPreviewChrome>
    </div>
  );
}
