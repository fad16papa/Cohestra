"use client";

import { AllowedEmbedHostsSection } from "@/components/settings/allowed-embed-hosts-section";
import { AccountSection } from "@/components/settings/account-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { CustomDomainSection } from "@/components/settings/custom-domain-section";
import { HelpSupportSection } from "@/components/settings/help-support-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { OrganizationTimezoneSection } from "@/components/settings/organization-timezone-section";
import { SettingsPlanUsageSection } from "@/components/settings/settings-plan-usage-section";
import { SettingsSubsectionDivider } from "@/components/settings/settings-subsection";
import type { SettingsSectionId } from "@/components/settings/settings-sections";

export function SettingsSectionBody({ id }: { id: SettingsSectionId }) {
  switch (id) {
    case "settings-plan":
      return <SettingsPlanUsageSection embedded />;
    case "settings-brand":
      return <BrandAccentSection embedded />;
    case "settings-organization":
      return <OrganizationTimezoneSection embedded />;
    case "settings-notifications":
      return <NotificationsSection embedded />;
    case "settings-embed":
      return <AllowedEmbedHostsSection embedded />;
    case "settings-domain":
      return <CustomDomainSection embedded />;
    case "settings-account":
      return (
        <>
          <AccountSection embedded />
          <SettingsSubsectionDivider />
          <ChangePasswordSection embedded />
        </>
      );
    case "settings-support":
      return <HelpSupportSection embedded />;
    default:
      return null;
  }
}
