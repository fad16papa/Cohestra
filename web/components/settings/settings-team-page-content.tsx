"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamInvite,
  fetchTeamOverview,
  removeTeamMember,
  revokeTeamInvite,
  type TeamOverview,
} from "@/lib/team/team-api";

type PendingTeamAction =
  | { kind: "remove"; userId: string; label: string }
  | { kind: "revoke"; inviteId: string; label: string };

const listShellClassName =
  "divide-y divide-border-warm rounded-xl border border-border-warm bg-card";

export function SettingsTeamPageContent() {
  const router = useRouter();
  const { authFetch, profile } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"TenantMember" | "TenantAdmin">("TenantMember");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingTeamAction | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
    if (shell && !shell.isTenantAdmin) {
      router.replace("/settings");
    }
  }, [router, shell]);

  useEffect(() => {
    if (!shell?.isTenantAdmin) {
      return;
    }

    void loadTeam();
  }, [loadTeam, shell?.isTenantAdmin]);

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (pendingAction.kind === "remove") {
        await removeTeamMember(authFetch, pendingAction.userId);
      } else {
        await revokeTeamInvite(authFetch, pendingAction.inviteId);
      }

      setPendingAction(null);
      await loadTeam();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not complete that action.");
    } finally {
      setActionSubmitting(false);
    }
  }

  if (!shell?.isTenantAdmin) {
    return (
      <p className="text-sm text-text-muted-warm">
        Team settings are available to tenant admins only.
      </p>
    );
  }

  if (loading && !team) {
    return <p className="text-sm text-text-muted-warm">Loading team…</p>;
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
        description="Basic workspaces are intentionally solo. Compare Core and Pro below — both unlock team invites up to your plan seat cap."
        requiredPlan="Core"
        isTenantAdmin
      />
    );
  }

  const seatsRemaining = Math.max(0, team.seatLimit - team.seatsUsed);

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-text-warm">Team</h1>
          <p className="mt-1 text-sm text-text-muted-warm">
            {team.seatsUsed} of {team.seatLimit} seats used
            {seatsRemaining > 0 ? ` · ${seatsRemaining} available` : " · at capacity"}
          </p>
        </div>

        {team.seatCapReached ? (
          <div
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-text-warm"
            role="status"
          >
            <p className="font-medium">Seat cap reached</p>
            <p className="mt-1 text-text-muted-warm">
              Revoke a pending invite, remove a member, or{" "}
              <Link href="/settings/billing" className="text-primary underline">
                upgrade your plan
              </Link>{" "}
              for more seats.
            </p>
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-warm">Members</h2>
          <ul className={listShellClassName}>
            {team.members.map((member) => {
              const isSelf = profile?.userId === member.userId;
              const canRemove = !isSelf;

              return (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-text-warm">
                      {member.nickname ?? member.email}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-text-muted-warm">(you)</span>
                      ) : null}
                    </p>
                    <p className="text-text-muted-warm">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-muted-warm">
                      {member.role}
                    </span>
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActionError(null);
                          setPendingAction({
                            kind: "remove",
                            userId: member.userId,
                            label: member.nickname ?? member.email,
                          });
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-warm">Pending invites</h2>
          {team.invites.length > 0 ? (
            <ul className={listShellClassName}>
              {team.invites.map((invite) => (
                <li
                  key={invite.inviteId}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-text-warm">{invite.email}</p>
                    <p className="text-text-muted-warm">
                      {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActionError(null);
                      setPendingAction({
                        kind: "revoke",
                        inviteId: invite.inviteId,
                        label: invite.email,
                      });
                    }}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-border-warm bg-card px-4 py-3 text-sm text-text-muted-warm">
              No pending invites. Sent invites appear here until accepted or revoked.
            </p>
          )}
        </section>

        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

        <section className="space-y-4 rounded-xl border border-border-warm bg-card p-5">
          <h2 className="text-sm font-medium text-text-warm">Invite by email</h2>
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "TenantMember" | "TenantAdmin")}
                disabled={team.seatCapReached || submitting}
              >
                <option value="TenantMember">Member</option>
                <option value="TenantAdmin">Admin</option>
              </select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={team.seatCapReached || submitting || !email.trim()}>
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </form>
        </section>
      </div>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionSubmitting) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === "revoke" ? "Revoke invite?" : "Remove team member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "revoke" ? (
                <>
                  Revoke the invite for{" "}
                  <span className="font-medium text-text-warm">{pendingAction.label}</span>? They will
                  not be able to join with the current link.
                </>
              ) : (
                <>
                  Remove{" "}
                  <span className="font-medium text-text-warm">{pendingAction?.label}</span> from this
                  workspace? They will lose access immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionSubmitting}>No</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={actionSubmitting}
              onClick={() => void confirmPendingAction()}
            >
              {actionSubmitting ? "Working…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
