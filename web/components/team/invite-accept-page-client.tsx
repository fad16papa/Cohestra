"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptTeamInvite, fetchInvitePreview, type InvitePreview } from "@/lib/team/team-api";

export function InviteAcceptPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    return <p className="text-sm text-stone">Loading invite…</p>;
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-ink">Invite unavailable</h1>
        <p className="text-sm text-stone">{error ?? "This invite is invalid or expired."}</p>
        <Link href="/login" className={marketingAtelierButtonClass("ghost")}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-gold">Team invite</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{preview.tenantName}</h1>
        <p className="mt-2 text-sm text-stone">
          Join as <span className="font-medium text-ink">{preview.role}</span> with{" "}
          <span className="font-medium text-ink">{preview.email}</span>
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-line bg-paper-warm p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          setError(null);
          void acceptTeamInvite(token, password, nickname.trim() || undefined)
            .then(() => {
              router.push(`/login?email=${encodeURIComponent(preview.email)}&invited=1`);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Could not accept invite."))
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="nickname">Display name (new accounts)</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Optional for existing accounts"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button type="submit" disabled={submitting} className={marketingAtelierButtonClass("lagoon")}>
          {submitting ? "Joining…" : "Accept invite"}
        </button>
      </form>
    </div>
  );
}
