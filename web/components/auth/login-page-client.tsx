"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LoginWorkspaceNotice } from "@/components/auth/login-workspace-notice";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { fetchOnboardingStatus } from "@/lib/auth-api";
import { clearAuthSession } from "@/lib/auth-storage";
import type { PublishedSiteBranding } from "@/lib/site-seo-metadata";

type LoginWorkspaceNoticeProps = {
  workspaceLabel: string;
  host: string;
};

function LoginPageContent({
  siteBranding,
  workspaceNotice,
}: {
  siteBranding: PublishedSiteBranding | null;
  workspaceNotice: LoginWorkspaceNoticeProps | null;
}) {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { profile, status } = useAuth();
  const reason = searchParams.get("reason");
  const reset = searchParams.get("reset");
  const invitedEmail = searchParams.get("email")?.trim() ?? "";
  const invitedAccept = searchParams.get("invited") === "1";
  const showSessionExpiredNotice = reason === "session-expired";

  useEffect(() => {
    if (reset === "1") {
      showToast("Password updated. Sign in with your new password.");
    }
  }, [reset, showToast]);

  useEffect(() => {
    if (!invitedAccept || !invitedEmail || status !== "authenticated" || !profile) {
      return;
    }

    if (profile.email.toLowerCase() === invitedEmail.toLowerCase()) {
      return;
    }

    clearAuthSession();
    window.location.replace(
      `/login?email=${encodeURIComponent(invitedEmail)}&invited=1`
    );
  }, [invitedAccept, invitedEmail, profile, status]);

  return (
    <AuthFlowShell
      siteBranding={siteBranding}
      title="Sign in"
      description="Manage activities, your client list, and outreach from one workspace."
      footer={
        <div className="space-y-3">
          <p className="text-xs leading-relaxed">
            For authorized operators only.
          </p>
          <OnboardingLink />
          <p>
            <Link href="/forgot-password" className="font-medium text-lagoon hover:text-lagoon-deep">
              Forgot password?
            </Link>
          </p>
        </div>
      }
    >
      {workspaceNotice ? (
        <LoginWorkspaceNotice
          workspaceLabel={workspaceNotice.workspaceLabel}
          host={workspaceNotice.host}
        />
      ) : null}
      <LoginForm
        showSessionExpiredNotice={showSessionExpiredNotice}
        initialEmail={invitedEmail}
        invitedAccept={invitedAccept}
      />
    </AuthFlowShell>
  );
}

function OnboardingLink() {
  const [href, setHref] = useState<"/register" | null>(null);

  useEffect(() => {
    void fetchOnboardingStatus()
      .then((status) => {
        if (status.registrationAvailable) {
          setHref("/register");
        }
      })
      .catch(() => {});
  }, []);

  if (!href) {
    return null;
  }

  return (
    <p>
      First time here?{" "}
      <Link href={href} className="font-medium text-lagoon hover:text-lagoon-deep">
        Create your operator account
      </Link>
    </p>
  );
}

export function LoginPageClient({
  siteBranding = null,
  workspaceNotice = null,
}: {
  siteBranding?: PublishedSiteBranding | null;
  workspaceNotice?: LoginWorkspaceNoticeProps | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-sm text-text-muted-warm">
          Loading sign-in…
        </div>
      }
    >
      <LoginPageContent
        siteBranding={siteBranding}
        workspaceNotice={workspaceNotice}
      />
    </Suspense>
  );
}
