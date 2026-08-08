import type { Metadata } from "next";
import { Suspense } from "react";

import { SignupPageContent } from "@/components/legal/signup-page-content";

export const metadata: Metadata = {
  title: "Sign up — Cohestra",
  description: "Create a free Basic workspace on Cohestra. No credit card required.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
