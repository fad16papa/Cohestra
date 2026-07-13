import type { Metadata } from "next";

import { LoginPageClient } from "@/components/auth/login-page-client";
import {
  buildLoginMetadata,
  fetchPublishedSiteBranding,
} from "@/lib/site-seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchPublishedSiteBranding();
  return buildLoginMetadata(branding);
}

export default async function LoginPage() {
  const siteBranding = await fetchPublishedSiteBranding();
  return <LoginPageClient siteBranding={siteBranding} />;
}
