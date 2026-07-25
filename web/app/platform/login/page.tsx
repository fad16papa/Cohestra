import type { Metadata } from "next";

import { PlatformLoginPageClient } from "@/components/auth/platform-login-page-client";
import { PLATFORM_NAME } from "@/lib/brand-assets";

export const metadata: Metadata = {
  title: `Platform admin sign in | ${PLATFORM_NAME}`,
  description: "Sign in to the Cohestra platform console.",
  robots: { index: false, follow: false },
};

export default function PlatformLoginPage() {
  return <PlatformLoginPageClient />;
}
