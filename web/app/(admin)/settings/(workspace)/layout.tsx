import type { ReactNode } from "react";
import { SettingsWorkspaceChrome } from "@/components/settings/settings-workspace-chrome";

export default function SettingsWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SettingsWorkspaceChrome>{children}</SettingsWorkspaceChrome>;
}
