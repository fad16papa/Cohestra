"use client";

import { AppearanceSection } from "@/components/settings/appearance-section";
import { AccountSection } from "@/components/settings/account-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { CustomDomainSection } from "@/components/settings/custom-domain-section";
import { HelpSupportSection } from "@/components/settings/help-support-section";
import { OrganizationTimezoneSection } from "@/components/settings/organization-timezone-section";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsPlanUsageSection } from "@/components/settings/settings-plan-usage-section";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import {
  SettingsMobileNav,
  SettingsSideNav,
  type SettingsNavItem,
} from "@/components/settings/settings-side-nav";
import { SettingsSubsectionDivider } from "@/components/settings/settings-subsection";
import { SettingsWorkspaceNav } from "@/components/settings/settings-workspace-nav";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";

export function SettingsPageContent() {
  const { shell } = useTenantShell();
  const isTenantAdmin = shell?.isTenantAdmin ?? false;

  const navItems: SettingsNavItem[] = [
    ...(isTenantAdmin
      ? [
          { id: "settings-plan", label: "Plan & limits" },
          { id: "settings-brand", label: "Brand accent" },
          { id: "settings-organization", label: "Organization" },
        ]
      : []),
    { id: "settings-account", label: "Account" },
    { id: "settings-support", label: "Help & support" },
    { id: "settings-appearance", label: "Appearance" },
    ...(isTenantAdmin ? [{ id: "settings-domain", label: "Custom domain" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <SettingsPageHeader />

      {isTenantAdmin ? <SettingsWorkspaceNav /> : null}

      <SettingsMobileNav items={navItems} />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="hidden w-44 shrink-0 lg:block">
          <div className="sticky top-20">
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.12em] text-text-muted-warm">
              On this page
            </p>
            <SettingsSideNav items={navItems} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {isTenantAdmin ? (
            <>
              <SettingsSectionCard
                id="settings-plan"
                title="Plan & limits"
                description="Headroom for published activities and monthly registrations on your current plan."
              >
                <SettingsPlanUsageSection embedded />
              </SettingsSectionCard>

              <SettingsSectionCard
                id="settings-brand"
                title="Brand accent"
                description="Personalize buttons, links, and dashboard highlights for this workspace."
              >
                <BrandAccentSection embedded />
              </SettingsSectionCard>

              <SettingsSectionCard
                id="settings-organization"
                title="Organization"
                description="Timezone used for monthly registration limits and public registration caps."
              >
                <OrganizationTimezoneSection embedded />
              </SettingsSectionCard>
            </>
          ) : null}

          <SettingsSectionCard
            id="settings-account"
            title="Your account"
            description="Signed-in operator profile and password for this workspace."
          >
            <AccountSection embedded />
            <SettingsSubsectionDivider />
            <ChangePasswordSection embedded />
          </SettingsSectionCard>

          <SettingsSectionCard
            id="settings-support"
            title="Help & support"
            description="Contact Creativorare and track your recent support requests."
          >
            <HelpSupportSection embedded />
          </SettingsSectionCard>

          <SettingsSectionCard
            id="settings-appearance"
            title="Appearance"
            description="How Cohestra looks on this device — synced with the top-bar theme control."
          >
            <AppearanceSection embedded />
          </SettingsSectionCard>

          {isTenantAdmin ? (
            <div id="settings-domain">
              <CustomDomainSection />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
