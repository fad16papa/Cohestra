"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword, resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  showSessionExpiredNotice?: boolean;
  initialEmail?: string;
  invitedAccept?: boolean;
};

const fieldShellClassName =
  "flex min-h-12 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30";

export function LoginForm({
  showSessionExpiredNotice = false,
  initialEmail = "",
  invitedAccept = false,
}: LoginFormProps) {
  const router = useRouter();
  const { applyProfile, profile, status } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (status === "authenticated" && profile) {
      if (
        invitedAccept
        && initialEmail
        && profile.email.toLowerCase() !== initialEmail.trim().toLowerCase()
      ) {
        return;
      }

      router.replace(resolvePostLoginPath(profile));
    }
  }, [initialEmail, invitedAccept, profile, router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await loginWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.ok) {
      applyProfile(result.profile);
      router.replace(resolvePostLoginPath(result.profile));
      return;
    }

    if (result.errorCode === "email_not_verified") {
      router.push(`/register/verify?email=${encodeURIComponent(email.trim())}`);
      return;
    }

    setError(result.message);
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
        <Label htmlFor="email" className="text-text-warm">
          Email address
        </Label>
        <div
          className={cn(
            fieldShellClassName,
            error ? "border-destructive/40 focus-within:ring-destructive/20" : null
          )}
        >
          <Mail className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-text-warm">
          Password
        </Label>
        <div
          className={cn(
            fieldShellClassName,
            "pr-1.5",
            error ? "border-destructive/40 focus-within:ring-destructive/20" : null
          )}
        >
          <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              "text-text-muted-warm outline-none transition-colors hover:bg-muted/60 hover:text-text-warm",
              "focus-visible:ring-2 focus-visible:ring-ring"
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

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className={cn(
          "min-h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/20 sm:text-sm",
          "bg-gradient-to-r from-primary to-accent text-primary-foreground",
          "hover:from-primary/95 hover:to-accent/95",
          "disabled:opacity-70"
        )}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          "Sign in to workspace"
        )}
      </Button>
    </form>
  );
}
