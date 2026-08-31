import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Frame,
  Globe,
  LifeBuoy,
  Palette,
  Settings2,
  Sparkles,
  User,
} from "lucide-react";

export type SettingsSectionId =
  | "settings-plan"
  | "settings-brand"
  | "settings-organization"
  | "settings-notifications"
  | "settings-embed"
  | "settings-domain"
  | "settings-account"
  | "settings-support"
  | "settings-appearance";

export type SettingsSectionGroup = "workspace" | "personal";

export type SettingsSectionMeta = {
  id: SettingsSectionId;
  label: string;
  description: string;
  group: SettingsSectionGroup;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const settingsSectionGroups: Array<{ id: SettingsSectionGroup; label: string }> = [
  { id: "workspace", label: "Workspace" },
  { id: "personal", label: "Personal" },
];

export const settingsSections: SettingsSectionMeta[] = [
  {
    id: "settings-plan",
    label: "Plan & limits",
    description: "Headroom for published activities and monthly registrations.",
    group: "workspace",
    icon: Settings2,
    adminOnly: true,
  },
  {
    id: "settings-brand",
    label: "Brand accent",
    description: "Buttons, links, and dashboard highlights.",
    group: "workspace",
    icon: Sparkles,
    adminOnly: true,
  },
  {
    id: "settings-organization",
    label: "Organization",
    description: "Registration month timezone and limits.",
    group: "workspace",
    icon: Globe,
    adminOnly: true,
  },
  {
    id: "settings-notifications",
    label: "Notifications",
    description: "Email alerts when someone registers.",
    group: "workspace",
    icon: Bell,
    adminOnly: true,
  },
  {
    id: "settings-embed",
    label: "Allowed embed hosts",
    description: "Origins that may iframe your registration embed.",
    group: "workspace",
    icon: Frame,
    adminOnly: true,
  },
  {
    id: "settings-domain",
    label: "Custom domain",
    description: "Enterprise hostname — coming soon.",
    group: "workspace",
    icon: Globe,
    adminOnly: true,
  },
  {
    id: "settings-account",
    label: "Your account",
    description: "Operator profile and password.",
    group: "personal",
    icon: User,
  },
  {
    id: "settings-support",
    label: "Help & support",
    description: "Contact Creativorare and track requests.",
    group: "personal",
    icon: LifeBuoy,
  },
  {
    id: "settings-appearance",
    label: "Appearance",
    description: "Light, dark, or system theme.",
    group: "personal",
    icon: Palette,
  },
];

export function getDefaultSettingsSection(isTenantAdmin: boolean): SettingsSectionId {
  return isTenantAdmin ? "settings-plan" : "settings-account";
}
