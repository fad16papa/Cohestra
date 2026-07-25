import type { Metadata } from "next";

import { SignupVerifyPageContent } from "@/components/legal/signup-verify-page-content";

export const metadata: Metadata = {
  title: "Verify email — Cohestra",
  description: "Verify your email to open your Cohestra workspace.",
};

export default function SignupVerifyPage() {
  return <SignupVerifyPageContent />;
}
