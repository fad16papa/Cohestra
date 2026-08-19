"use client";

import { Mail, Shield } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

type AccountSectionProps = {
  /** When true, hides redundant navigation (e.g. on the settings page itself). */
  embedded?: boolean;
};

export function AccountSection({ embedded = false }: AccountSectionProps) {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <section className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-section text-text-warm">Account</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Your signed-in operator profile for this workspace.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border-warm/80 bg-muted/20 p-4">
        <div className="min-w-0 space-y-3">
          <p className="flex items-center gap-2 text-sm text-text-warm">
            <Mail className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
            <span className="truncate font-medium">{profile.email}</span>
          </p>
          {profile.nickname ? (
            <p className="text-sm text-text-muted-warm">
              Display name{" "}
              <span className="font-medium text-text-warm">{profile.nickname}</span>
            </p>
          ) : null}
          {profile.roles.length > 0 ? (
            <p className="flex items-center gap-2 text-xs text-text-muted-warm">
              <Shield className="size-3.5 shrink-0" aria-hidden />
              {profile.roles.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
