"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { LoginForm } from "@/components/auth/login-form";
import { OPERATOR_LOGIN_PATH } from "@/lib/auth-api";

function PlatformLoginPageContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const showSessionExpiredNotice = reason === "session-expired";

  return (
    <AuthFlowShell
      siteBranding={null}
      eyebrow="Platform console"
      title="Platform admin sign in"
      description="Sign in to manage tenants, complimentary plans, and Cohestra platform operations."
      footer={
        <div className="space-y-3">
          <p className="text-xs leading-relaxed">
            Restricted access for Cohestra platform administrators only.
          </p>
          <p>
            Looking for a workspace?{" "}
            <Link
              href={OPERATOR_LOGIN_PATH}
              className="font-medium text-lagoon hover:text-lagoon-deep"
            >
              Operator sign in
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm
        audience="platform"
        showSessionExpiredNotice={showSessionExpiredNotice}
        submitLabel="Sign in to platform console"
      />
    </AuthFlowShell>
  );
}

export function PlatformLoginPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-sm text-text-muted-warm">
          Loading platform sign-in…
        </div>
      }
    >
      <PlatformLoginPageContent />
    </Suspense>
  );
}
