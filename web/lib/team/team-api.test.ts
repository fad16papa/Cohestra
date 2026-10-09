import { describe, expect, it } from "vitest";

import { formatInviteRole, mapTeamProblemMessage } from "@/lib/team/team-api";

describe("mapTeamProblemMessage", () => {
  it("keeps role denial out of plan-lock copy", () => {
    expect(mapTeamProblemMessage("plan_locked", "ignored", "fallback")).toMatch(/plan does not include/i);
    expect(mapTeamProblemMessage("plan_locked", "ignored", "fallback")).not.toMatch(/permission/i);
  });

  it("treats seat cap as capacity, not permission", () => {
    const message = mapTeamProblemMessage("seat_cap_reached", "ignored", "fallback");
    expect(message).toMatch(/seat allowance/i);
    expect(message).toMatch(/revoke/i);
    expect(message).toMatch(/remove a member/i);
    expect(message).not.toMatch(/permission/i);
  });

  it("surfaces last-admin conflict without ownership transfer language", () => {
    expect(mapTeamProblemMessage("member_remove_conflict", "ignored", "fallback")).toMatch(
      /at least one admin/i
    );
  });

  it("formats Tenant roles for operators without inventing new roles", () => {
    expect(formatInviteRole("TenantAdmin")).toBe("admin");
    expect(formatInviteRole("TenantMember")).toBe("member");
  });

  it("falls back to server detail for other codes", () => {
    expect(mapTeamProblemMessage("invite_conflict", "Already pending.", "fallback")).toBe(
      "Already pending."
    );
    expect(mapTeamProblemMessage(undefined, undefined, "Could not send invite.")).toBe(
      "Could not send invite."
    );
  });
});
