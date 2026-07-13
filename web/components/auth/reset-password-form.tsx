"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendAuthOtp, resetPassword } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const fieldShellClassName =
  "flex min-h-12 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30";

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    searchParams.get("sent") === "1"
      ? "If an account exists, a reset code was sent to your email."
      : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace("/forgot-password");
    }
  }, [email, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const message = await resetPassword({
        email,
        code: code.trim(),
        newPassword,
      });
      setInfo(message);
      router.push("/login?reset=1");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not reset password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setIsResending(true);

    try {
      const message = await resendAuthOtp(email, "password_reset");
      setInfo(message);
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : "Could not resend code."
      );
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return null;
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-text-muted-warm">
        Reset code sent to <span className="font-medium text-text-warm">{email}</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="code">Reset code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="min-h-12 text-center text-2xl tracking-[0.35em]"
          placeholder="000000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <div className={fieldShellClassName}>
          <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className={fieldShellClassName}>
          <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {info ? (
        <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-warm">
          {info}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || code.length !== 6}
        className={cn(
          "min-h-12 w-full rounded-xl font-semibold",
          "bg-gradient-to-r from-primary to-accent text-primary-foreground"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Updating password…
          </>
        ) : (
          <>
            <KeyRound className="size-4" aria-hidden />
            Set new password
          </>
        )}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm text-text-muted-warm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending}
          className="font-medium text-primary hover:underline disabled:opacity-60"
        >
          {isResending ? "Sending…" : "Resend reset code"}
        </button>
        <Link href="/login" className="hover:text-text-warm">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading…</p>}>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
