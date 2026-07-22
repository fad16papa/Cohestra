"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamInvite,
  fetchTeamOverview,
  revokeTeamInvite,
  type TeamOverview,
} from "@/lib/team/team-api";

export function SettingsTeamPageContent() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"TenantMember" | "TenantAdmin">("TenantMember");
  const [submitting, setSubmitting] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchTeamOverview(authFetch);
      setTeam(overview);
      void refreshShell();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, refreshShell]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  if (!shell?.isTenantAdmin) {
    return (
      <p className="text-sm text-stone">
        Team settings are available to tenant admins only.
      </p>
    );
  }

  if (loading && !team) {
    return <p className="text-sm text-stone">Loading team…</p>;
  }

  if (error && !team) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!team) {
    return null;
  }

  if (!team.invitesAllowed) {
    return (
      <UpgradePanel
        title="Add a second keyholder"
        description="Basic workspaces are intentionally solo. Upgrade to Core to invite a partner who can help operate the atelier."
        requiredPlan="Core"
        isTenantAdmin
        checkoutHref="/billing/checkout?plan=core&interval=monthly"
      />
    );
  }

  const seatsRemaining = Math.max(0, team.seatLimit - team.seatsUsed);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Team</h1>
        <p className="mt-1 text-sm text-stone">
          {team.seatsUsed} of {team.seatLimit} seats used
          {seatsRemaining > 0 ? ` · ${seatsRemaining} available` : " · at capacity"}
        </p>
      </div>

      {team.seatCapReached ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Seat cap reached</p>
          <p className="mt-1 text-amber-900/90">
            Revoke a pending invite or{" "}
            <Link href="/billing/checkout?plan=pro&interval=monthly" className="underline">
              upgrade your plan
            </Link>{" "}
            for more seats.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink">Members</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper-warm">
          {team.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">{member.nickname ?? member.email}</p>
                <p className="text-stone">{member.email}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-stone">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {team.invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-ink">Pending invites</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper-warm">
            {team.invites.map((invite) => (
              <li key={invite.inviteId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{invite.email}</p>
                  <p className="text-stone">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void revokeTeamInvite(authFetch, invite.inviteId).then(() => loadTeam())
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-line bg-paper-warm p-5">
        <h2 className="text-sm font-medium text-ink">Invite by email</h2>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (team.seatCapReached || !email.trim()) {
              return;
            }

            setSubmitting(true);
            setError(null);
            void createTeamInvite(authFetch, email.trim(), role)
              .then(() => {
                setEmail("");
                return loadTeam();
              })
              .catch((err: Error & { errorCode?: string }) => {
                setError(err.message);
              })
              .finally(() => setSubmitting(false));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={team.seatCapReached || submitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="flex h-10 w-full rounded-md border border-line bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "TenantMember" | "TenantAdmin")}
              disabled={team.seatCapReached || submitting}
            >
              <option value="TenantMember">Member</option>
              <option value="TenantAdmin">Admin</option>
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={team.seatCapReached || submitting || !email.trim()}
            className={marketingAtelierButtonClass("lagoon")}
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
        </form>
      </section>
    </div>
  );
}
