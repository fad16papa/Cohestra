import type { Metadata } from "next";

import { SignupPageContent } from "@/components/legal/signup-page-content";

export const metadata: Metadata = {
  title: "Start free — Cohestra",
  description: "Create a free Basic workspace on Cohestra. No credit card required.",
};

export default function SignupPage() {
  return <SignupPageContent />;
}
