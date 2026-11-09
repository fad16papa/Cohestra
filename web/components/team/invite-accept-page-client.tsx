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
  startInviteActivation,
  verifyInviteActivation,
  type InvitePreview,
} from "@/lib/team/team-api";

const fieldShellClassName =
  "flex min-h-11 items-center gap-3 rounded-[10px] border border-border-control bg-paper px-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring";

const inviteInputClassName =
  "auth-login-input min-h-0 h-auto w-full min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-0 py-0 text-base text-ink shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 sm:text-sm placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50";

function buildTenantLoginUrl(slug: string, query: Record<string, string>): string {
  const dashboardUrl = buildTenantDashboardUrl(slug);
  const loginUrl = dashboardUrl.replace(/\/dashboard\/?$/, "/login");
  const params = new URLSearchParams(query);
  return `${loginUrl}?${params.toString()}`;
}

function finishInviteLogin(
  result: { email: string; tenantSlug: string },
  password: string,
  applyProfile: ReturnType<typeof useAuth>["applyProfile"]
): Promise<void> {
  clearAuthSession();
  return loginWithPassword(result.email, password).then((loginResult) => {
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
  });
}

function formatExpiryCountdown(seconds: number): string {
  if (seconds <= 0) {
    return "Code may have expired.";
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes > 0) {
    return `Code expires in about ${minutes} minute${minutes === 1 ? "" : "s"}${
      remainder > 0 ? ` ${remainder}s` : ""
    }.`;
  }
  return `Code expires in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

function InviteActivationForm({
  preview,
  token,
  applyProfile,
}: {
  preview: InvitePreview;
  token: string;
  applyProfile: ReturnType<typeof useAuth>["applyProfile"];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = formatInviteRole(preview.role);
  const trimmedNickname = nickname.trim();

  useEffect(() => {
    if (step !== 2 || expiresInSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setExpiresInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, expiresInSeconds]);

  async function sendCode() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await startInviteActivation(token, trimmedNickname);
      setMaskedEmail(result.maskedEmail);
      setExpiresInSeconds(result.expiresInSeconds);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 1) {
    return (
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode();
        }}
      >
        <div className="rounded-xl border border-line bg-paper-warm px-4 py-3 text-sm leading-relaxed text-text-muted">
          <p>
            You are setting up{" "}
            <span className="font-medium text-ink">{preview.tenantName}</span> as its first{" "}
            <span className="font-medium text-ink">{roleLabel}</span>.
          </p>
          <p className="mt-1 min-w-0 break-words">
            We will email a one-time code to confirm the address on this invite.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activation-nickname" className="text-ink">
            Display name
          </Label>
          <div className={fieldShellClassName}>
            <UserRound className="size-4 shrink-0 text-icon-muted" aria-hidden />
            <input
              id="activation-nickname"
              name="nickname"
              type="text"
              autoComplete="nickname"
              required
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className={inviteInputClassName}
              placeholder="How teammates see you"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activation-password" className="text-ink">
            Password
          </Label>
          <div className={fieldShellClassName}>
            <Lock className="size-4 shrink-0 text-icon-muted" aria-hidden />
            <input
              id="activation-password"
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
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting || trimmedNickname.length === 0} className="min-h-11 w-full">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending code…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        void verifyInviteActivation(token, password, trimmedNickname, code.trim())
          .then((result) => finishInviteLogin(result, password, applyProfile))
          .catch((err) =>
            setError(err instanceof Error ? err.message : "Could not verify code.")
          )
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="rounded-xl border border-line bg-paper-warm px-4 py-3 text-sm leading-relaxed text-text-muted">
        <p className="font-medium text-ink">Verify your email</p>
        <p className="mt-1 min-w-0 break-words">
          Enter the six-digit code we sent to{" "}
          <span className="font-medium text-ink">{maskedEmail ?? "your email"}</span>.
        </p>
        <p className="mt-2 text-xs">{formatExpiryCountdown(expiresInSeconds)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activation-code" className="text-ink">
          Verification code
        </Label>
        <div className={fieldShellClassName}>
          <input
            id="activation-code"
            name="one-time-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Six-digit verification code"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className={inviteInputClassName}
            placeholder="000000"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting || code.trim().length !== 6} className="min-h-11 w-full">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Verifying…
          </>
        ) : (
          "Verify and join"
        )}
      </Button>

      <button
        type="button"
        disabled={submitting}
        onClick={() => void sendCode()}
        className="min-h-11 w-full text-sm font-medium text-text-link underline-offset-2 hover:underline disabled:opacity-50"
      >
        Resend code
      </button>
    </form>
  );
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
          .then((result) => finishInviteLogin(result, password, applyProfile))
          .catch((err) =>
            setError(err instanceof Error ? err.message : "Could not accept invite.")
          )
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="rounded-xl border border-line bg-paper-warm px-4 py-3 text-sm leading-relaxed text-text-muted">
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
          <span className="ml-1 font-normal text-text-muted">(new accounts only)</span>
        </Label>
        <div className={fieldShellClassName}>
          <UserRound className="size-4 shrink-0 text-icon-muted" aria-hidden />
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
          <Lock className="size-4 shrink-0 text-icon-muted" aria-hidden />
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
        <p className="text-xs leading-relaxed text-text-muted">
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
        <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
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
          <Link href="/login" className="font-medium text-text-link underline-offset-2 hover:underline">
            Go to sign in
          </Link>
        }
      >
        <p className="text-center text-sm text-text-muted">
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
      {preview.requiresActivationOtp ? (
        <InviteActivationForm preview={preview} token={token} applyProfile={applyProfile} />
      ) : (
        <InviteAcceptForm preview={preview} token={token} applyProfile={applyProfile} />
      )}
    </AuthFlowShell>
  );
}
