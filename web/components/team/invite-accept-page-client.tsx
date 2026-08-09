"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Lock, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { loginWithPassword } from "@/lib/auth-api";
import { clearAuthSession } from "@/lib/auth-storage";
import { buildTenantDashboardUrl } from "@/lib/signup/signup-api";
import {
  acceptTeamInvite,
  fetchInvitePreview,
  formatInviteRole,
  type InvitePreview,
} from "@/lib/team/team-api";

const fieldShellClassName =
  "flex min-h-11 items-center gap-3 rounded-[10px] border border-line bg-paper px-3 transition-colors focus-within:border-lagoon/40 focus-within:ring-2 focus-within:ring-lagoon/15";

const inviteInputClassName =
  "auth-login-input min-h-0 h-auto w-full min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-0 py-0 text-base text-ink shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 sm:text-sm placeholder:text-stone disabled:cursor-not-allowed disabled:opacity-50";

function buildTenantLoginUrl(slug: string, query: Record<string, string>): string {
  const dashboardUrl = buildTenantDashboardUrl(slug);
  const loginUrl = dashboardUrl.replace(/\/dashboard\/?$/, "/login");
  const params = new URLSearchParams(query);
  return `${loginUrl}?${params.toString()}`;
}

function InviteAcceptForm({
  preview,
  token,
  applyProfile,
}: {
  preview: InvitePreview;
  token: string;
  applyProfile: ReturnType<typeof useAuth>["applyProfile"];
}) {
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = formatInviteRole(preview.role);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        void acceptTeamInvite(token, password, nickname.trim() || undefined)
          .then(async (result) => {
            clearAuthSession();

            const loginResult = await loginWithPassword(result.email, password);
            if (loginResult.ok) {
              if ("redirected" in loginResult && loginResult.redirected) {
                return;
              }

              if ("profile" in loginResult) {
                applyProfile(loginResult.profile);
              }

              window.location.assign(buildTenantDashboardUrl(result.tenantSlug));
              return;
            }

            window.location.assign(
              buildTenantLoginUrl(result.tenantSlug, {
                email: result.email,
                invited: "1",
              })
            );
          })
          .catch((err) =>
            setError(err instanceof Error ? err.message : "Could not accept invite.")
          )
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="rounded-xl border border-line bg-paper-warm px-4 py-3 text-sm leading-relaxed text-stone">
        <p>
          You are joining{" "}
          <span className="font-medium text-ink">{preview.tenantName}</span> as{" "}
          <span className="font-medium text-ink">{roleLabel}</span>.
        </p>
        <p className="mt-1">
          Account email:{" "}
          <span className="font-medium text-ink">{preview.email}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname" className="text-ink">
          Display name
          <span className="ml-1 font-normal text-stone">(new accounts only)</span>
        </Label>
        <div className={fieldShellClassName}>
          <UserRound className="size-4 shrink-0 text-stone" aria-hidden />
          <input
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className={inviteInputClassName}
            placeholder="Optional for existing accounts"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-ink">
          Password
        </Label>
        <div className={fieldShellClassName}>
          <Lock className="size-4 shrink-0 text-stone" aria-hidden />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inviteInputClassName}
            placeholder="At least 8 characters"
          />
        </div>
        <p className="text-xs leading-relaxed text-stone">
          Choose a password for your Cohestra account. If you already have an account with this
          email, use your existing password.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="min-h-11 w-full">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Joining workspace…
          </>
        ) : (
          "Accept invite"
        )}
      </Button>
    </form>
  );
}

export function InviteAcceptPageClient() {
  const searchParams = useSearchParams();
  const { applyProfile } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invite link is missing a token.");
      return;
    }

    void fetchInvitePreview(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : "Invite not found."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <AuthFlowShell
        eyebrow="Team invite"
        title="Loading invite"
        description="Checking your invitation link…"
      >
        <p className="flex items-center justify-center gap-2 text-sm text-stone">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading invite…
        </p>
      </AuthFlowShell>
    );
  }

  if (!preview) {
    return (
      <AuthFlowShell
        eyebrow="Team invite"
        title="Invite unavailable"
        description={error ?? "This invite is invalid, expired, or has already been used."}
        footer={
          <Link href="/login" className="font-medium text-lagoon hover:text-lagoon-deep">
            Go to sign in
          </Link>
        }
      >
        <p className="text-center text-sm text-stone">
          Ask your workspace admin to send a new invite if you still need access.
        </p>
      </AuthFlowShell>
    );
  }

  return (
    <AuthFlowShell
      eyebrow="Team invite"
      title={preview.tenantName}
      description={`Join as ${formatInviteRole(preview.role)} with ${preview.email}`}
      footer={
        <p className="text-xs leading-relaxed">
          By accepting, you will get access to this workspace after sign-in.
        </p>
      }
    >
      <InviteAcceptForm preview={preview} token={token} applyProfile={applyProfile} />
    </AuthFlowShell>
  );
}
