"use client";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";

export function CustomDomainSection() {
  return (
    <SettingsSectionCard
      title="Custom domain (Enterprise)"
      description="Use your own hostname for public homepage and registration links."
    >
      <p className="text-sm leading-relaxed text-text-muted-warm">
        Custom domains are coming soon on Enterprise plans. Contact us to join the
        waitlist or request DNS setup guidance for your organization.
      </p>
      <p className="text-sm">
        <a
          href="mailto:hello@cohestra.app?subject=Enterprise%20custom%20domain"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Email hello@cohestra.app about custom domains
        </a>
      </p>
    </SettingsSectionCard>
  );
}
