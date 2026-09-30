import { redirect } from "next/navigation";

import {
  ANALYTICS_PATH,
  destinationWithSearch,
} from "@/lib/admin-canonical-routes";

export default async function ReportsCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(destinationWithSearch(ANALYTICS_PATH, await searchParams));
}
