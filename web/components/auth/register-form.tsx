"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AtSign, Loader2, Lock, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchOnboardingStatus, registerOperator } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const fieldShellClassName =
  "flex min-h-12 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30";

export function RegisterForm() {
  const router = useRouter();
  const { status } = useAuth();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
      return;
    }

    void fetchOnboardingStatus()
      .then((result) => {
        if (!result.registrationAvailable) {
          router.replace("/login");
          return;
        }
        setLoadingGate(false);
      })
      .catch(() => {
        setLoadingGate(false);
      });
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerOperator({ email, nickname, password });
      router.push(
        `/register/verify?email=${encodeURIComponent(result.email)}`
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create your account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingGate) {
    return <p className="text-sm text-text-muted-warm">Checking workspace…</p>;
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="nickname">Nickname</Label>
        <div className={fieldShellClassName}>
          <UserRound className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="nickname"
            name="nickname"
            autoComplete="nickname"
            required
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="How should we greet you?"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className={fieldShellClassName}>
          <AtSign className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className={fieldShellClassName}>
          <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="At least 8 characters"
          />
        </div>
        <p className="text-xs text-text-muted-warm">
          Use upper and lower case letters plus a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className={fieldShellClassName}>
          <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-sm"
            placeholder="Repeat your password"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "min-h-12 w-full rounded-xl text-base font-semibold sm:text-sm",
          "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Creating account…
          </>
        ) : (
          "Continue to email verification"
        )}
      </Button>

      <p className="text-center text-sm text-text-muted-warm">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
