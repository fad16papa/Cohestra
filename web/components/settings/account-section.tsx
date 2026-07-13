"use client";

import Link from "next/link";
import { LogOut, Mail, Shield } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";

export function AccountSection() {
  const { profile, logout } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-text-warm">Account</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Your signed-in operator profile for this workspace.
        </p>
      </div>

      <div className="rounded-xl border border-border-warm bg-muted/20 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-2 text-sm text-text-warm">
              <Mail className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
              <span className="truncate">{profile.email}</span>
            </p>
            {profile.nickname ? (
              <p className="text-sm text-text-muted-warm">
                Nickname: <span className="font-medium text-text-warm">{profile.nickname}</span>
              </p>
            ) : null}
            {profile.roles.length > 0 ? (
              <p className="flex items-center gap-2 text-xs text-text-muted-warm">
                <Shield className="size-3.5 shrink-0" aria-hidden />
                {profile.roles.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
              Workspace settings
            </Link>
            <Button type="button" variant="destructive" className="gap-2" onClick={logout}>
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
