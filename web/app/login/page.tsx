import type { Metadata } from "next";

import { LoginPageClient } from "@/components/auth/login-page-client";
import { fetchPublicDoorServer } from "@/lib/public-door-api";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  buildLoginMetadata,
  fetchPublishedSiteBranding,
} from "@/lib/site-seo-metadata";
import {
  formatTenantWorkspaceLabel,
  parseTenantSlugFromOrigin,
} from "@/lib/tenant-host";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchPublishedSiteBranding();
  return buildLoginMetadata(branding);
}

export default async function LoginPage() {
  const [siteBranding, door, origin] = await Promise.all([
    fetchPublishedSiteBranding(),
    fetchPublicDoorServer(),
    getRequestOrigin(),
  ]);

  const tenantSlug =
    door.tenantSlug?.trim() ||
    (origin ? parseTenantSlugFromOrigin(origin) : null);
  const host = origin ? new URL(origin).host : null;
  const workspaceNotice =
    tenantSlug && host
      ? {
          workspaceLabel: formatTenantWorkspaceLabel(
            tenantSlug,
            door.tenantName ?? siteBranding?.siteName ?? null
          ),
          host,
        }
      : null;

  return (
    <LoginPageClient
      siteBranding={siteBranding}
      workspaceNotice={workspaceNotice}
    />
  );
}
