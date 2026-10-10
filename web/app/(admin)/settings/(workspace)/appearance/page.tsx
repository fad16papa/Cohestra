import { redirect } from "next/navigation";

import { SETTINGS_PROFILE_PATH } from "@/lib/admin-canonical-routes";

export default function SettingsAppearancePage() {
  redirect(SETTINGS_PROFILE_PATH);
}
