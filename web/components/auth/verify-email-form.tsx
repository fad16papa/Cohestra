"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendAuthOtp, verifyEmailOtp } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

function VerifyEmailFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applyProfile } = useAuth();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace("/register");
    }
  }, [email, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const result = await verifyEmailOtp(email, code.trim());
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    applyProfile(result.profile);
    router.replace("/dashboard");
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setIsResending(true);

    try {
      const message = await resendAuthOtp(email, "email_verification");
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
      <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-warm">
        We sent a 6-digit code to{" "}
        <span className="font-medium">{email}</span>. Enter it below to activate
        your workspace.
      </p>

      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="min-h-12 text-center text-2xl tracking-[0.35em] sm:text-xl"
          placeholder="000000"
        />
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
            Verifying…
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" aria-hidden />
            Verify and enter workspace
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
          {isResending ? "Sending…" : "Resend code"}
        </button>
        <Link href="/register" className="hover:text-text-warm">
          Use a different email
        </Link>
      </div>
    </form>
  );
}

export function VerifyEmailForm() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading…</p>}>
      <VerifyEmailFormContent />
    </Suspense>
  );
}
