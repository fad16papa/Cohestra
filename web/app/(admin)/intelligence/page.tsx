import { redirect } from "next/navigation";

import { AI_PATH, destinationWithSearch } from "@/lib/admin-canonical-routes";

export default async function IntelligenceCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(destinationWithSearch(AI_PATH, await searchParams));
}
