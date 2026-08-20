"use client";

import { AppearanceSection } from "@/components/settings/appearance-section";
import { AccountSection } from "@/components/settings/account-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { CustomDomainSection } from "@/components/settings/custom-domain-section";
import { HelpSupportSection } from "@/components/settings/help-support-section";
import { OrganizationTimezoneSection } from "@/components/settings/organization-timezone-section";
import { SettingsCollapsibleSection } from "@/components/settings/settings-collapsible-section";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsPlanUsageSection } from "@/components/settings/settings-plan-usage-section";
import { SettingsSubsectionDivider } from "@/components/settings/settings-subsection";
import { SettingsWorkspaceNav } from "@/components/settings/settings-workspace-nav";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";

export function SettingsPageContent() {
  const { shell } = useTenantShell();
  const isTenantAdmin = shell?.isTenantAdmin ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10">
      <SettingsPageHeader />

      {isTenantAdmin ? <SettingsWorkspaceNav /> : null}

      <div className="space-y-3">
        {isTenantAdmin ? (
          <>
            <SettingsCollapsibleSection
              id="settings-plan"
              title="Plan & limits"
              description="Headroom for published activities and monthly registrations on your current plan."
              defaultOpen
            >
              <SettingsPlanUsageSection embedded />
            </SettingsCollapsibleSection>

            <SettingsCollapsibleSection
              id="settings-brand"
              title="Brand accent"
              description="Personalize buttons, links, and dashboard highlights for this workspace."
            >
              <BrandAccentSection embedded />
            </SettingsCollapsibleSection>

            <SettingsCollapsibleSection
              id="settings-organization"
              title="Organization"
              description="Timezone used for monthly registration limits and public registration caps."
            >
              <OrganizationTimezoneSection embedded />
            </SettingsCollapsibleSection>
          </>
        ) : null}

        <SettingsCollapsibleSection
          id="settings-account"
          title="Your account"
          description="Signed-in operator profile and password for this workspace."
          defaultOpen={!isTenantAdmin}
        >
          <AccountSection embedded />
          <SettingsSubsectionDivider />
          <ChangePasswordSection embedded />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          id="settings-support"
          title="Help & support"
          description="Contact Creativorare and track your recent support requests."
        >
          <HelpSupportSection embedded />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          id="settings-appearance"
          title="Appearance"
          description="How Cohestra looks on this device — synced with the top-bar theme control."
        >
          <AppearanceSection embedded />
        </SettingsCollapsibleSection>

        {isTenantAdmin ? (
          <SettingsCollapsibleSection
            id="settings-domain"
            title="Custom domain"
            description="Use your own hostname for public pages — Enterprise, coming soon."
          >
            <CustomDomainSection embedded />
          </SettingsCollapsibleSection>
        ) : null}
      </div>
    </div>
  );
}
