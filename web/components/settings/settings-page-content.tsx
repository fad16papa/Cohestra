"use client";

import { AppearanceSection } from "@/components/settings/appearance-section";
import { AccountSection } from "@/components/settings/account-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { HelpSupportSection } from "@/components/settings/help-support-section";
import { CustomDomainSection } from "@/components/settings/custom-domain-section";
import { OrganizationTimezoneSection } from "@/components/settings/organization-timezone-section";
import { SettingsPlanUsageSection } from "@/components/settings/settings-plan-usage-section";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { SettingsWorkspaceNav } from "@/components/settings/settings-workspace-nav";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";

export function SettingsPageContent() {
  const { shell } = useTenantShell();
  const isTenantAdmin = shell?.isTenantAdmin ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-text-muted-warm">
          Manage your operator account and workspace preferences. Campaign delivery and
          infrastructure setup stay on the server — nothing for you to configure here.
        </p>
      </div>

      {isTenantAdmin ? (
        <>
          <SettingsWorkspaceNav />
          <SettingsSectionCard
            title="Workspace"
            description="Branding, plan usage, and registration month timezone for this organization."
          >
            <SettingsPlanUsageSection />
            <BrandAccentSection />
            <OrganizationTimezoneSection />
          </SettingsSectionCard>
          <CustomDomainSection />
        </>
      ) : null}

      <SettingsSectionCard
        title="Your account"
        description="Signed-in operator profile and security for this workspace."
      >
        <AccountSection embedded />
        <ChangePasswordSection />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Help & support"
        description="Contact Creativorare and track your recent support requests."
      >
        <HelpSupportSection />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Appearance"
        description="How Cohestra looks on this device."
      >
        <AppearanceSection />
      </SettingsSectionCard>
    </div>
  );
}
