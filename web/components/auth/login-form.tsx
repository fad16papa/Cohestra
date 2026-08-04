"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  isPlatformAdminProfile,
  loginWithPassword,
  OPERATOR_LOGIN_PATH,
  resolvePostLoginPath,
} from "@/lib/auth-api";
import { buildVerifyEmailPath } from "@/lib/verify-email-path";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  audience?: "operator" | "platform";
  showSessionExpiredNotice?: boolean;
  initialEmail?: string;
  invitedAccept?: boolean;
  submitLabel?: string;
};

const fieldShellClassName =
  "flex min-h-11 items-center gap-3 rounded-[10px] border border-line bg-paper px-3 transition-colors focus-within:border-lagoon/40 focus-within:ring-2 focus-within:ring-lagoon/15";

const loginInputClassName =
  "auth-login-input min-h-0 h-auto w-full min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-0 py-0 text-base text-ink shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 sm:text-sm placeholder:text-stone disabled:cursor-not-allowed disabled:opacity-50";

export function LoginForm({
  audience = "operator",
  showSessionExpiredNotice = false,
  initialEmail = "",
  invitedAccept = false,
  submitLabel,
}: LoginFormProps) {
  const router = useRouter();
  const { applyProfile, clearSession, profile, status } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationRedirectPath, setVerificationRedirectPath] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedSubmitLabel =
    submitLabel
    ?? (audience === "platform" ? "Sign in to platform console" : "Sign in to workspace");

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    setVerificationRedirectPath(null);
    setError(null);
  }, [email, password]);

  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      return;
    }

    if (
      invitedAccept
      && initialEmail
      && profile.email.toLowerCase() !== initialEmail.trim().toLowerCase()
    ) {
      return;
    }

    if (audience === "platform") {
      if (isPlatformAdminProfile(profile)) {
        router.replace("/platform");
        return;
      }

      router.replace("/dashboard");
      return;
    }

    router.replace(resolvePostLoginPath(profile));
  }, [audience, initialEmail, invitedAccept, profile, router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (verificationRedirectPath) {
      router.push(verificationRedirectPath);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await loginWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.ok && "redirected" in result && result.redirected) {
      return;
    }

    if (!result.ok) {
      const isUnverified =
        result.errorCode === "email_not_verified"
        || result.message.toLowerCase().includes("verify your email");

      if (isUnverified) {
        setVerificationRedirectPath(
          buildVerifyEmailPath(email.trim(), result.verifyTenantSlug)
        );
        return;
      }

      setError(result.message);
      return;
    }

    if (!("profile" in result)) {
      return;
    }

    if (audience === "platform" && !isPlatformAdminProfile(result.profile)) {
      clearSession();
      setError(
        `This page is for Cohestra platform admins only. Use the operator workspace sign-in instead.`
      );
      return;
    }

    applyProfile(result.profile);
    router.replace(
      audience === "platform" ? "/platform" : resolvePostLoginPath(result.profile)
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {showSessionExpiredNotice ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          Your session expired. Sign in again to continue where you left off.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-ink">
          Email address
        </Label>
        <div className={fieldShellClassName}>
          <Mail className="size-4 shrink-0 text-stone" aria-hidden />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={loginInputClassName}
            placeholder={audience === "platform" ? "admin@cohestra.app" : "you@example.com"}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-ink">
          Password
        </Label>
        <div className={cn(fieldShellClassName, "pr-1.5")}>
          <Lock className="size-4 shrink-0 text-stone" aria-hidden />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={loginInputClassName}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              "text-stone outline-none transition-colors hover:bg-paper-warm hover:text-ink",
              "focus-visible:ring-2 focus-visible:ring-lagoon/30"
            )}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {verificationRedirectPath ? (
        <p
          role="status"
          className="rounded-xl border border-lagoon/20 bg-lagoon/[0.06] px-4 py-3 text-sm text-ink"
        >
          Your email is not verified yet. Continue below to enter the code we sent you
          or request a new one.
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{error}</p>
          {audience === "platform" && error.includes("operator workspace") ? (
            <p>
              <a
                href={OPERATOR_LOGIN_PATH}
                className="font-medium text-lagoon underline-offset-2 hover:text-lagoon-deep hover:underline"
              >
                Go to operator sign in
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className={cn(
          "min-h-11 w-full rounded-[10px] text-sm font-semibold",
          "bg-lagoon text-lagoon-fg hover:bg-lagoon-deep",
          "disabled:opacity-70"
        )}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : verificationRedirectPath ? (
          "Verify your account"
        ) : (
          resolvedSubmitLabel
        )}
      </Button>
    </form>
  );
}
