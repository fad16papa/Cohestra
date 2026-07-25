import { headers } from "next/headers";

export async function getRequestOrigin(): Promise<string | null> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host?.trim()) {
    return null;
  }

  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host.trim()}`;
}
