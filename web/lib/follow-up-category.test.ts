/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import type { ClientListItem, LeadStatus } from "@/lib/clients-api";
import {
  FOLLOW_UP_PAGE_SIZE,
  FollowUpAccessError,
  classifyFollowUpFetchFailure,
  classifyFollowUpListState,
  commitFollowUpCategoryChange,
  countFollowUpCategories,
  followUpContextCaption,
  followUpHrefForCategory,
  loadFollowUpClients,
  needsAttentionCount,
  parseFollowUpCategoryParam,
  resolveFollowUpCategory,
  resolveFollowUpCategoryParam,
  serializeFollowUpCategoryParam,
} from "@/lib/follow-up-category";

function client(overrides: Partial<ClientListItem> & { leadStatus: LeadStatus }): ClientListItem {
  return {
    id: overrides.id ?? "c1",
    fullName: overrides.fullName ?? "Ada Example",
    phone: overrides.phone ?? null,
    email: overrides.email ?? null,
    consentGiven: overrides.consentGiven ?? true,
    nationality: overrides.nationality ?? null,
    leadStatus: overrides.leadStatus,
    lastRegistrationAt: overrides.lastRegistrationAt ?? null,
    lastActivityName: overrides.lastActivityName ?? null,
    lastOutreachAt: overrides.lastOutreachAt ?? null,
    lastOutreachKind: overrides.lastOutreachKind ?? null,
    nextFollowUpAt: overrides.nextFollowUpAt ?? null,
  };
}

describe("follow-up category derivation", () => {
  it("assigns Due now for a due follow-up date regardless of lead status", () => {
    expect(
      resolveFollowUpCategory(
        client({ leadStatus: "active", nextFollowUpAt: "2020-01-01T00:00:00.000Z" }),
        "UTC"
      )
    ).toBe("due-now");
    expect(
      resolveFollowUpCategory(
        client({ leadStatus: "inactive", nextFollowUpAt: "2020-01-01T00:00:00.000Z" }),
        "UTC"
      )
    ).toBe("due-now");
  });

  it("assigns Due now for a new lead with no recorded outreach", () => {
    expect(
      resolveFollowUpCategory(client({ leadStatus: "new", lastOutreachAt: null }), "UTC")
    ).toBe("due-now");
  });

  it("assigns Opportunity for a new lead that already has outreach", () => {
    expect(
      resolveFollowUpCategory(
        client({
          leadStatus: "new",
          lastOutreachAt: "2026-09-01T00:00:00.000Z",
          lastOutreachKind: "whatsapp",
        }),
        "UTC"
      )
    ).toBe("opportunity");
  });

  it("assigns Opportunity for contacted without a due follow-up", () => {
    expect(resolveFollowUpCategory(client({ leadStatus: "contacted" }), "UTC")).toBe(
      "opportunity"
    );
  });

  it("assigns At risk for inactive without a due follow-up", () => {
    expect(resolveFollowUpCategory(client({ leadStatus: "inactive" }), "UTC")).toBe(
      "at-risk"
    );
  });

  it("assigns Healthy for active without a due follow-up", () => {
    expect(resolveFollowUpCategory(client({ leadStatus: "active" }), "UTC")).toBe(
      "healthy"
    );
  });

  it("excludes Healthy from needs-attention totals", () => {
    const counts = countFollowUpCategories(
      [
        client({ id: "1", leadStatus: "new" }),
        client({ id: "2", leadStatus: "inactive" }),
        client({ id: "3", leadStatus: "contacted" }),
        client({ id: "4", leadStatus: "active" }),
        client({ id: "5", leadStatus: "active" }),
      ],
      "UTC"
    );

    expect(counts).toEqual({
      "due-now": 1,
      "at-risk": 1,
      opportunity: 1,
      healthy: 2,
    });
    expect(needsAttentionCount(counts)).toBe(3);
  });
});

describe("follow-up list states", () => {
  it("keeps loading and errors from looking like empty success", () => {
    expect(
      classifyFollowUpListState({
        loading: true,
        errorKind: "none",
        needsAttentionCount: 0,
        selectedCount: 0,
      })
    ).toBe("loading");
    expect(
      classifyFollowUpListState({
        loading: false,
        errorKind: "recoverable",
        needsAttentionCount: 0,
        selectedCount: 0,
      })
    ).toBe("error");
    expect(
      classifyFollowUpListState({
        loading: false,
        errorKind: "permission",
        needsAttentionCount: 0,
        selectedCount: 0,
      })
    ).toBe("permission");
  });

  it("distinguishes global empty from selected-filter empty", () => {
    expect(
      classifyFollowUpListState({
        loading: false,
        errorKind: "none",
        needsAttentionCount: 0,
        selectedCount: 0,
      })
    ).toBe("global-empty");
    expect(
      classifyFollowUpListState({
        loading: false,
        errorKind: "none",
        needsAttentionCount: 4,
        selectedCount: 0,
      })
    ).toBe("filter-empty");
    expect(
      classifyFollowUpListState({
        loading: false,
        errorKind: "none",
        needsAttentionCount: 0,
        selectedCount: 6,
      })
    ).toBe("populated");
  });
});

describe("follow-up category query", () => {
  it("parses absent, valid, and invalid values", () => {
    expect(parseFollowUpCategoryParam(null)).toBe("absent");
    expect(parseFollowUpCategoryParam("")).toBe("absent");
    expect(parseFollowUpCategoryParam("due-now")).toBe("due-now");
    expect(parseFollowUpCategoryParam("at-risk")).toBe("at-risk");
    expect(parseFollowUpCategoryParam("opportunity")).toBe("opportunity");
    expect(parseFollowUpCategoryParam("healthy")).toBe("healthy");
    expect(parseFollowUpCategoryParam("overdue")).toBe("invalid");
  });

  it("resolves absent and invalid to Due now and omits Due now from the URL", () => {
    expect(resolveFollowUpCategoryParam(null)).toBe("due-now");
    expect(resolveFollowUpCategoryParam("nope")).toBe("due-now");
    expect(serializeFollowUpCategoryParam("due-now")).toBeNull();
    expect(followUpHrefForCategory("due-now")).toBe("/follow-up");
    expect(followUpHrefForCategory("healthy")).toBe("/follow-up?category=healthy");
    expect(followUpHrefForCategory("due-now", "category=healthy&utm=1")).toBe(
      "/follow-up?utm=1"
    );
  });

  it("treats re-selecting the current category as a true no-op", () => {
    const replace = vi.fn();
    expect(
      commitFollowUpCategoryChange({
        category: "due-now",
        currentCategory: "due-now",
        liveSearch: "",
        replace,
      })
    ).toBe("noop");
    expect(replace).not.toHaveBeenCalled();

    expect(
      commitFollowUpCategoryChange({
        category: "healthy",
        currentCategory: "due-now",
        liveSearch: "utm=1",
        replace,
      })
    ).toBe("replaced");
    expect(replace).toHaveBeenCalledWith("/follow-up?utm=1&category=healthy");
  });
});

describe("follow-up fetch failure classification", () => {
  it("classifies access errors as permission and other failures as recoverable", () => {
    expect(classifyFollowUpFetchFailure(new FollowUpAccessError())).toBe("permission");
    expect(classifyFollowUpFetchFailure(new Error("Request failed (403)"))).toBe(
      "recoverable"
    );
    expect(classifyFollowUpFetchFailure(new Error("Could not load Follow-up."))).toBe(
      "recoverable"
    );
  });
});

describe("follow-up context captions", () => {
  it("uses recorded outreach language and never claims a message was sent", () => {
    const due = client({
      leadStatus: "active",
      nextFollowUpAt: "2020-01-01T00:00:00.000Z",
    });
    const caption = followUpContextCaption(due, "due-now", "UTC");
    expect(caption).toMatch(/^Follow-up due · /);
    expect(caption.toLowerCase()).not.toContain("sent");
    expect(caption.toLowerCase()).not.toContain("whatsapp message");

    const quiet = followUpContextCaption(
      client({
        leadStatus: "inactive",
        lastOutreachAt: "2026-09-01T00:00:00.000Z",
        lastOutreachKind: null,
      }),
      "at-risk",
      "UTC"
    );
    expect(quiet.toLowerCase()).not.toContain("never");
    expect(quiet).toMatch(/^Last recorded outreach · /);
  });
});

describe("loadFollowUpClients", () => {
  function listBody(items: Array<Record<string, unknown>>, page: number, totalCount: number) {
    return {
      items,
      page,
      pageSize: FOLLOW_UP_PAGE_SIZE,
      totalCount,
      statusCounts: {
        newCount: 0,
        contactedCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        mergeSuspectCount: 0,
        followUpDueCount: 0,
      },
    };
  }

  it("pages through the existing clients API and stops at the last page", async () => {
    const first = Array.from({ length: FOLLOW_UP_PAGE_SIZE }, (_, index) => ({
      id: `p1-${index}`,
      fullName: `Page One ${index}`,
      consentGiven: true,
      leadStatus: "active",
    }));
    const authFetch = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost:8080");
      const page = Number(url.searchParams.get("page"));
      if (page === 1) {
        return new Response(JSON.stringify(listBody(first, 1, FOLLOW_UP_PAGE_SIZE + 1)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify(
          listBody(
            [{ id: "p2-1", fullName: "Page Two", consentGiven: true, leadStatus: "inactive" }],
            2,
            FOLLOW_UP_PAGE_SIZE + 1
          )
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const items = await loadFollowUpClients(authFetch);
    expect(authFetch).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(FOLLOW_UP_PAGE_SIZE + 1);
    expect(items.at(-1)?.fullName).toBe("Page Two");
  });

  it("throws FollowUpAccessError on 403 and does not keep a partial list", async () => {
    const authFetch = vi.fn(async () => new Response("forbidden", { status: 403 }));
    await expect(loadFollowUpClients(authFetch)).rejects.toBeInstanceOf(FollowUpAccessError);
  });

  it("fails closed when a later page errors or the unique merge is short", async () => {
    const first = Array.from({ length: FOLLOW_UP_PAGE_SIZE }, (_, index) => ({
      id: `ok-${index}`,
      fullName: `Ok ${index}`,
      consentGiven: true,
      leadStatus: "active",
    }));
    const authFetch = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost:8080");
      const page = Number(url.searchParams.get("page"));
      if (page === 1) {
        return new Response(
          JSON.stringify(listBody(first, 1, FOLLOW_UP_PAGE_SIZE + 2)),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ detail: "Follow-up source unavailable." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    });

    await expect(loadFollowUpClients(authFetch)).rejects.toThrow(/Request failed \(500\)|unavailable/i);

    const shortPage = vi.fn(async () => {
      return new Response(
        JSON.stringify(
          listBody(
            [{ id: "only", fullName: "Only", consentGiven: true, leadStatus: "active" }],
            1,
            8
          )
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    await expect(loadFollowUpClients(shortPage)).rejects.toThrow(
      "Could not load the complete Follow-up list."
    );
  });
});
