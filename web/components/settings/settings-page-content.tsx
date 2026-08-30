"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { AppearanceSection } from "@/components/settings/appearance-section";
import { AccountSection } from "@/components/settings/account-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { CustomDomainSection } from "@/components/settings/custom-domain-section";
import { HelpSupportSection } from "@/components/settings/help-support-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { OrganizationTimezoneSection } from "@/components/settings/organization-timezone-section";
import { SettingsLeftRail } from "@/components/settings/settings-left-rail";
import { SettingsMobileSectionTabs } from "@/components/settings/settings-mobile-section-tabs";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsPlanUsageSection } from "@/components/settings/settings-plan-usage-section";
import { SettingsRightRail } from "@/components/settings/settings-right-rail";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";
import {
  getDefaultSettingsSection,
  settingsSections,
  type SettingsSectionId,
  type SettingsSectionMeta,
} from "@/components/settings/settings-sections";
import { SettingsSubsectionDivider } from "@/components/settings/settings-subsection";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function renderSectionContent(id: SettingsSectionId): React.ReactNode {
  switch (id) {
    case "settings-plan":
      return <SettingsPlanUsageSection embedded />;
    case "settings-brand":
      return <BrandAccentSection embedded />;
    case "settings-organization":
      return <OrganizationTimezoneSection embedded />;
    case "settings-notifications":
      return <NotificationsSection embedded />;
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
    case "settings-appearance":
      return <AppearanceSection embedded />;
    default:
      return null;
  }
}

export function SettingsPageContent() {
  const { shell } = useTenantShell();
  const isTenantAdmin = shell?.isTenantAdmin ?? false;

  const visibleSections = useMemo(
    () => settingsSections.filter((section) => !section.adminOnly || isTenantAdmin),
    [isTenantAdmin]
  );

  const [activeId, setActiveId] = useState<SettingsSectionId>(() =>
    getDefaultSettingsSection(isTenantAdmin)
  );
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  useEffect(() => {
    if (!visibleSections.some((section) => section.id === activeId)) {
      setActiveId(getDefaultSettingsSection(isTenantAdmin));
    }
  }, [activeId, isTenantAdmin, visibleSections]);

  const activeSection: SettingsSectionMeta =
    visibleSections.find((section) => section.id === activeId) ?? visibleSections[0];

  const showBillingLink = shell?.plan === "Basic" || shell?.isBillingOwner === true;

  return (
    <div className="flex w-full flex-col gap-4 pb-8 lg:gap-5">
      <SettingsPageHeader />

      <SettingsMobileSectionTabs
        sections={visibleSections}
        activeId={activeId}
        onSelect={setActiveId}
      />

      <div className="flex items-center justify-end lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-border-warm"
          onClick={() => setMobileContextOpen(true)}
        >
          <Info className="size-4" aria-hidden />
          Context
        </Button>
      </div>

      <div
        className={cn(
          "flex min-h-[28rem] w-full overflow-hidden rounded-2xl border border-border-warm/80",
          "bg-card/40 shadow-sm"
        )}
      >
        <SettingsLeftRail
          className="hidden border-r lg:flex"
          sections={visibleSections}
          activeId={activeId}
          onSelect={setActiveId}
          collapsed={leftCollapsed}
          onToggleCollapsed={() => setLeftCollapsed((value) => !value)}
          showBillingLink={showBillingLink}
          showAdminLinks={isTenantAdmin}
        />

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection ? (
            <SettingsSectionPanel section={activeSection}>
              {renderSectionContent(activeSection.id)}
            </SettingsSectionPanel>
          ) : null}
        </main>

        <SettingsRightRail
          className="hidden border-l xl:flex"
          activeId={activeId}
          collapsed={rightCollapsed}
          onToggleCollapsed={() => setRightCollapsed((value) => !value)}
        />
      </div>

      <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] p-0">
          <SheetHeader className="border-b border-border-warm px-4 py-3">
            <SheetTitle>Context</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <SettingsRightRail
              className="w-full border-0 bg-transparent"
              activeId={activeId}
              collapsed={false}
              onToggleCollapsed={() => setMobileContextOpen(false)}
              hideCollapseToggle
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
