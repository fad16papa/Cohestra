"use client";

import { SettingsAdminOnlyGate } from "@/components/settings/settings-admin-only-gate";
import { SettingsSectionBody } from "@/components/settings/settings-section-body";
import { settingsSections, type SettingsSectionId } from "@/components/settings/settings-sections";

export function SettingsAreaPage({
  id,
  adminOnly = false,
}: {
  id: SettingsSectionId;
  adminOnly?: boolean;
}) {
  const body = <SettingsSectionBody id={id} />;
  if (!adminOnly) {
    return body;
  }

  const label = settingsSections.find((section) => section.id === id)?.label ?? "Settings";
  return <SettingsAdminOnlyGate areaLabel={label}>{body}</SettingsAdminOnlyGate>;
}
