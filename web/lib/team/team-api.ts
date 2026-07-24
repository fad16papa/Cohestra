import { getPublicApiBaseUrl } from "@/lib/api";

export type TeamMember = {
  userId: string;
  email: string;
  nickname: string | null;
  role: string;
  joinedAt: string;
};

export type TeamPendingInvite = {
  inviteId: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export type TeamOverview = {
  plan: string;
  seatLimit: number;
  activeMembers: number;
  pendingInvites: number;
  seatsUsed: number;
  invitesAllowed: boolean;
  seatCapReached: boolean;
  members: TeamMember[];
  invites: TeamPendingInvite[];
};

export type InvitePreview = {
  tenantName: string;
  tenantSlug: string;
  email: string;
  role: string;
  expiresAt: string;
};

function parseTeamOverview(raw: Record<string, unknown>): TeamOverview {
  const membersRaw = raw.members ?? raw.Members;
  const invitesRaw = raw.invites ?? raw.Invites;

  const members = Array.isArray(membersRaw)
    ? membersRaw.map((item) => {
        const m = item as Record<string, unknown>;
        return {
          userId: String(m.userId ?? m.UserId ?? ""),
          email: String(m.email ?? m.Email ?? ""),
          nickname:
            typeof (m.nickname ?? m.Nickname) === "string"
              ? String(m.nickname ?? m.Nickname)
              : null,
          role: String(m.role ?? m.Role ?? ""),
          joinedAt: String(m.joinedAt ?? m.JoinedAt ?? ""),
        };
      })
    : [];

  const invites = Array.isArray(invitesRaw)
    ? invitesRaw.map((item) => {
        const i = item as Record<string, unknown>;
        return {
          inviteId: String(i.inviteId ?? i.InviteId ?? ""),
          email: String(i.email ?? i.Email ?? ""),
          role: String(i.role ?? i.Role ?? ""),
          expiresAt: String(i.expiresAt ?? i.ExpiresAt ?? ""),
          createdAt: String(i.createdAt ?? i.CreatedAt ?? ""),
        };
      })
    : [];

  return {
    plan: String(raw.plan ?? raw.Plan ?? "Basic"),
    seatLimit: Number(raw.seatLimit ?? raw.SeatLimit ?? 1),
    activeMembers: Number(raw.activeMembers ?? raw.ActiveMembers ?? 0),
    pendingInvites: Number(raw.pendingInvites ?? raw.PendingInvites ?? 0),
    seatsUsed: Number(raw.seatsUsed ?? raw.SeatsUsed ?? 0),
    invitesAllowed: Boolean(raw.invitesAllowed ?? raw.InvitesAllowed),
    seatCapReached: Boolean(raw.seatCapReached ?? raw.SeatCapReached),
    members,
    invites,
  };
}

export async function fetchTeamOverview(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<TeamOverview> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/team`);
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not load team.");
  }

  return parseTeamOverview(raw);
}

export async function createTeamInvite(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  email: string,
  role: "TenantAdmin" | "TenantMember"
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/team/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });

  if (response.ok) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const detail = raw.detail ?? raw.Detail;
  const extensions = raw.extensions as Record<string, unknown> | undefined;
  const errorCode = raw.errorCode ?? extensions?.errorCode;
  const message = typeof detail === "string" ? detail : "Could not send invite.";
  const err = new Error(message) as Error & { errorCode?: string };
  if (typeof errorCode === "string") {
    err.errorCode = errorCode;
  }
  throw err;
}

export async function revokeTeamInvite(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  inviteId: string
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/team/invites/${inviteId}`,
    { method: "DELETE" }
  );

  if (response.ok) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const detail = raw.detail ?? raw.Detail;
  throw new Error(typeof detail === "string" ? detail : "Could not revoke invite.");
}

export async function removeTeamMember(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  memberUserId: string
): Promise<void> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/team/members/${memberUserId}`,
    { method: "DELETE" }
  );

  if (response.ok) {
    return;
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const detail = raw.detail ?? raw.Detail;
  throw new Error(typeof detail === "string" ? detail : "Could not remove member.");
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const url = `${getPublicApiBaseUrl()}/api/v1/public/team/invites/preview?token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Invite not found.");
  }

  return {
    tenantName: String(raw.tenantName ?? raw.TenantName ?? ""),
    tenantSlug: String(raw.tenantSlug ?? raw.TenantSlug ?? ""),
    email: String(raw.email ?? raw.Email ?? ""),
    role: String(raw.role ?? raw.Role ?? ""),
    expiresAt: String(raw.expiresAt ?? raw.ExpiresAt ?? ""),
  };
}

export async function acceptTeamInvite(
  token: string,
  password: string,
  nickname?: string
): Promise<{ email: string; tenantSlug: string; createdAccount: boolean }> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/team/invites/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, nickname: nickname ?? null }),
  });

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const detail = raw.detail ?? raw.Detail;
    throw new Error(typeof detail === "string" ? detail : "Could not accept invite.");
  }

  return {
    email: String(raw.email ?? raw.Email ?? ""),
    tenantSlug: String(raw.tenantSlug ?? raw.TenantSlug ?? ""),
    createdAccount: Boolean(raw.createdAccount ?? raw.CreatedAccount),
  };
}
