"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { changePassword } from "@/lib/auth-api";

const fieldShellClassName =
  "flex min-h-11 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30";

export function ChangePasswordSection() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const message = await changePassword(authFetch, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(message);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-text-warm">Password</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Update your operator password without leaving the workspace.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border-warm bg-muted/20 p-4 sm:p-5"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <div className={fieldShellClassName}>
              <Lock className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="min-h-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <div className={fieldShellClassName}>
              <KeyRound className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
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
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <div className={fieldShellClassName}>
              <KeyRound className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
              <Input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="min-h-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
