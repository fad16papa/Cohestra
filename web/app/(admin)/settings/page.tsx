import { redirect } from "next/navigation";

import {
  SETTINGS_PROFILE_PATH,
  destinationWithSearch,
} from "@/lib/admin-canonical-routes";

export default async function SettingsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(destinationWithSearch(SETTINGS_PROFILE_PATH, await searchParams));
}
