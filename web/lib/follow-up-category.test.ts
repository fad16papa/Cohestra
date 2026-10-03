/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import type { ClientListItem, LeadStatus } from "@/lib/clients-api";
import {
  FOLLOW_UP_PAGE_SIZE,
  FollowUpAccessError,
  classifyFollowUpFetchFailure,
  classifyFollowUpListState,
  commitFollowUpCategoryChange,
  commitFollowUpPageChange,
  countFollowUpCategories,
  countsFromFollowUpResponse,
  followUpContextCaption,
  followUpClientHref,
  followUpHrefForCategory,
  loadFollowUpPage,
  needsAttentionCount,
  parseFollowUpCategoryParam,
  reconcileFollowUpPage,
  resolveFollowUpCategory,
  resolveFollowUpCategoryParam,
  resolveFollowUpPageParam,
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
    expect(followUpHrefForCategory("healthy", "utm=1&page=3", 1)).toBe(
      "/follow-up?utm=1&category=healthy"
    );
    expect(followUpHrefForCategory("at-risk", "utm=1", 2)).toBe(
      "/follow-up?utm=1&category=at-risk&page=2"
    );
    expect(followUpClientHref("abc-123")).toBe("/clients/abc-123");
  });

  it("resolves and reconciles page query values", () => {
    expect(resolveFollowUpPageParam(null)).toBe(1);
    expect(resolveFollowUpPageParam("0")).toBe(1);
    expect(resolveFollowUpPageParam("nope")).toBe(1);
    expect(resolveFollowUpPageParam("3")).toBe(3);
    expect(reconcileFollowUpPage(4, 25, 25)).toBe(1);
    expect(reconcileFollowUpPage(3, 40, 25)).toBe(2);
    expect(reconcileFollowUpPage(1, 0, 25)).toBe(1);
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

    replace.mockClear();
    expect(
      commitFollowUpPageChange({
        page: 2,
        currentPage: 2,
        category: "healthy",
        liveSearch: "category=healthy&page=2",
        replace,
      })
    ).toBe("noop");
    expect(replace).not.toHaveBeenCalled();
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

describe("loadFollowUpPage", () => {
  function listBody(
    items: Array<Record<string, unknown>>,
    page: number,
    totalCount: number,
    counts = {
      dueNowCount: 1,
      atRiskCount: 0,
      opportunityCount: 0,
      healthyCount: 2,
    }
  ) {
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
      followUpCategoryCounts: counts,
    };
  }

  it("requests only the selected category page and does not walk the tenant", async () => {
    const items = Array.from({ length: FOLLOW_UP_PAGE_SIZE }, (_, index) => ({
      id: `p1-${index}`,
      fullName: `Page One ${index}`,
      consentGiven: true,
      leadStatus: "new",
    }));
    const authFetch = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost:8080");
      expect(url.searchParams.get("followUpCategory")).toBe("due-now");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("pageSize")).toBe(String(FOLLOW_UP_PAGE_SIZE));
      return new Response(
        JSON.stringify(
          listBody(items, 1, 250, {
            dueNowCount: 250,
            atRiskCount: 10,
            opportunityCount: 8,
            healthyCount: 4000,
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await loadFollowUpPage(authFetch, { category: "due-now", page: 1 });
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(FOLLOW_UP_PAGE_SIZE);
    expect(result.totalCount).toBe(250);
    expect(result.counts).toEqual({
      "due-now": 250,
      "at-risk": 10,
      opportunity: 8,
      healthy: 4000,
    });
    expect(needsAttentionCount(result.counts)).toBe(268);
  });

  it("requests a later page without appending previous pages", async () => {
    const authFetch = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost:8080");
      expect(url.searchParams.get("followUpCategory")).toBe("healthy");
      expect(url.searchParams.get("page")).toBe("2");
      return new Response(
        JSON.stringify(
          listBody(
            [
              { id: "h-26", fullName: "Healthy 26", consentGiven: true, leadStatus: "active" },
            ],
            2,
            26,
            { dueNowCount: 0, atRiskCount: 0, opportunityCount: 0, healthyCount: 26 }
          )
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await loadFollowUpPage(authFetch, { category: "healthy", page: 2 });
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.items.map((item) => item.id)).toEqual(["h-26"]);
    expect(result.totalCount).toBe(result.counts.healthy);
  });

  it("fails closed when a page contains duplicate ids", async () => {
    const authFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify(
          listBody(
            [
              { id: "h-26", fullName: "Healthy 26", consentGiven: true, leadStatus: "active" },
              { id: "h-26", fullName: "Healthy 26 dup", consentGiven: true, leadStatus: "active" },
            ],
            2,
            26,
            { dueNowCount: 0, atRiskCount: 0, opportunityCount: 0, healthyCount: 26 }
          )
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    await expect(loadFollowUpPage(authFetch, { category: "healthy", page: 2 })).rejects.toThrow(
      "Follow-up page contained duplicate clients."
    );
  });

  it("throws FollowUpAccessError on 403", async () => {
    const authFetch = vi.fn(async () => new Response("forbidden", { status: 403 }));
    await expect(loadFollowUpPage(authFetch, { category: "due-now" })).rejects.toBeInstanceOf(
      FollowUpAccessError
    );
  });

  it("fails closed when totals are missing or the request errors", async () => {
    const missingTotals = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          items: [{ id: "only", fullName: "Only", consentGiven: true, leadStatus: "active" }],
          page: 1,
          pageSize: FOLLOW_UP_PAGE_SIZE,
          totalCount: 1,
          statusCounts: {
            newCount: 0,
            contactedCount: 0,
            activeCount: 1,
            inactiveCount: 0,
            mergeSuspectCount: 0,
            followUpDueCount: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    await expect(loadFollowUpPage(missingTotals, { category: "healthy" })).rejects.toThrow(
      "Could not load Follow-up category totals."
    );

    const emptyFirstPage = vi.fn(async () => {
      return new Response(
        JSON.stringify(
          listBody([], 1, 8, {
            dueNowCount: 0,
            atRiskCount: 0,
            opportunityCount: 0,
            healthyCount: 8,
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    await expect(loadFollowUpPage(emptyFirstPage, { category: "healthy", page: 1 })).rejects.toThrow(
      "Follow-up page was empty while category totals were non-zero."
    );

    const failed = vi.fn(async () => {
      return new Response(JSON.stringify({ detail: "Follow-up source unavailable." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    });
    await expect(loadFollowUpPage(failed, { category: "due-now" })).rejects.toThrow(
      /Request failed \(500\)|unavailable/i
    );
  });

  it("maps server totals without treating Healthy as needs attention", () => {
    expect(
      needsAttentionCount(
        countsFromFollowUpResponse({
          dueNowCount: 2,
          atRiskCount: 1,
          opportunityCount: 4,
          healthyCount: 90,
        })
      )
    ).toBe(7);
  });
});
