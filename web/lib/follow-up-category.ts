import {
  fetchClients,
  formatLastActivityCaption,
  formatLastOutreachCaption,
  formatNextFollowUpDate,
  isFollowUpDue,
  type ClientListItem,
} from "@/lib/clients-api";
import { FOLLOW_UP_PATH } from "@/lib/admin-canonical-routes";
import {
  appendContinuityContext,
  type ContinuityContext,
} from "@/lib/continuity-context";

export type FollowUpCategory = "due-now" | "at-risk" | "opportunity" | "healthy";

export const FOLLOW_UP_CATEGORY_QUERY_KEY = "category";
export const FOLLOW_UP_PAGE_QUERY_KEY = "page";
export const FOLLOW_UP_DEFAULT_CATEGORY: FollowUpCategory = "due-now";
export const FOLLOW_UP_DEFAULT_PAGE = 1;
export const FOLLOW_UP_PAGE_SIZE = 25;

export const FOLLOW_UP_CATEGORY_OPTIONS: {
  value: FollowUpCategory;
  label: string;
}[] = [
  { value: "due-now", label: "Due now" },
  { value: "at-risk", label: "At risk" },
  { value: "opportunity", label: "Opportunity" },
  { value: "healthy", label: "Healthy" },
];

export type FollowUpCategoryCounts = Record<FollowUpCategory, number>;

export type FollowUpListState =
  | "loading"
  | "error"
  | "permission"
  | "global-empty"
  | "filter-empty"
  | "populated";

export class FollowUpAccessError extends Error {
  constructor(message = "You don’t have access to Follow-up.") {
    super(message);
    this.name = "FollowUpAccessError";
  }
}

export function isFollowUpCategory(
  value: string | null | undefined
): value is FollowUpCategory {
  return (
    value === "due-now" ||
    value === "at-risk" ||
    value === "opportunity" ||
    value === "healthy"
  );
}

export function followUpCategoryLabel(category: FollowUpCategory): string {
  return (
    FOLLOW_UP_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Due now"
  );
}

export function parseFollowUpCategoryParam(
  value: string | null | undefined
): FollowUpCategory | "absent" | "invalid" {
  if (value == null || value === "") {
    return "absent";
  }
  if (isFollowUpCategory(value)) {
    return value;
  }
  return "invalid";
}

export function resolveFollowUpCategoryParam(
  value: string | null | undefined
): FollowUpCategory {
  const parsed = parseFollowUpCategoryParam(value);
  if (parsed === "absent" || parsed === "invalid") {
    return FOLLOW_UP_DEFAULT_CATEGORY;
  }
  return parsed;
}

export function serializeFollowUpCategoryParam(
  category: FollowUpCategory
): string | null {
  return category === FOLLOW_UP_DEFAULT_CATEGORY ? null : category;
}

export function resolveFollowUpPageParam(
  value: string | null | undefined
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return FOLLOW_UP_DEFAULT_PAGE;
  }
  return parsed;
}

export function serializeFollowUpPageParam(page: number): string | null {
  return page <= FOLLOW_UP_DEFAULT_PAGE ? null : String(page);
}

export function followUpPageCount(totalCount: number, pageSize = FOLLOW_UP_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, totalCount) / Math.max(1, pageSize)));
}

export function reconcileFollowUpPage(page: number, totalCount: number, pageSize = FOLLOW_UP_PAGE_SIZE): number {
  const lastPage = followUpPageCount(totalCount, pageSize);
  if (totalCount === 0) {
    return FOLLOW_UP_DEFAULT_PAGE;
  }
  return page > lastPage ? lastPage : page;
}

export function followUpClientHref(
  clientId: string,
  context?: ContinuityContext | null
): string {
  const href = `/clients/${clientId}`;
  return context ? appendContinuityContext(href, context) : href;
}

const PROFILE_OUTREACH_EVENT_TYPES = new Set([
  "email_campaign_sent",
  "whatsapp_initiated",
  "whatsapp_follow_up_recorded",
  "viber_initiated",
  "viber_follow_up_recorded",
]);

export function lastOutreachAtFromTimeline(
  timeline: Array<{ eventType: string; occurredAt: string }> | null | undefined
): string | null {
  if (!timeline?.length) {
    return null;
  }

  let latest: string | null = null;
  for (const event of timeline) {
    if (!PROFILE_OUTREACH_EVENT_TYPES.has(event.eventType)) {
      continue;
    }
    if (!latest || event.occurredAt > latest) {
      latest = event.occurredAt;
    }
  }
  return latest;
}

export function shouldOfferOpenInFollowUp(
  client: Pick<ClientListItem, "leadStatus" | "nextFollowUpAt" | "lastOutreachAt">,
  timeZoneId?: string | null
): boolean {
  return resolveFollowUpCategory(client, timeZoneId) === "due-now";
}

export function openInFollowUpHref(): string {
  return FOLLOW_UP_PATH;
}

export function followUpHrefForCategory(
  category: FollowUpCategory,
  currentSearch = "",
  page = FOLLOW_UP_DEFAULT_PAGE
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
  );
  const serialized = serializeFollowUpCategoryParam(category);
  if (serialized) {
    params.set(FOLLOW_UP_CATEGORY_QUERY_KEY, serialized);
  } else {
    params.delete(FOLLOW_UP_CATEGORY_QUERY_KEY);
  }

  const serializedPage = serializeFollowUpPageParam(page);
  if (serializedPage) {
    params.set(FOLLOW_UP_PAGE_QUERY_KEY, serializedPage);
  } else {
    params.delete(FOLLOW_UP_PAGE_QUERY_KEY);
  }

  const query = params.toString();
  return query.length > 0 ? `${FOLLOW_UP_PATH}?${query}` : FOLLOW_UP_PATH;
}

export function commitFollowUpCategoryChange(input: {
  category: FollowUpCategory;
  currentCategory: FollowUpCategory;
  liveSearch: string;
  replace?: (href: string) => void;
}): "noop" | "replaced" {
  if (input.category === input.currentCategory) {
    return "noop";
  }

  input.replace?.(
    followUpHrefForCategory(input.category, input.liveSearch, FOLLOW_UP_DEFAULT_PAGE)
  );
  return "replaced";
}

export function commitFollowUpPageChange(input: {
  page: number;
  currentPage: number;
  category: FollowUpCategory;
  liveSearch: string;
  replace?: (href: string) => void;
}): "noop" | "replaced" {
  if (input.page === input.currentPage || input.page < 1) {
    return "noop";
  }

  input.replace?.(followUpHrefForCategory(input.category, input.liveSearch, input.page));
  return "replaced";
}

export function resolveFollowUpCategory(
  client: Pick<ClientListItem, "leadStatus" | "nextFollowUpAt" | "lastOutreachAt">,
  timeZoneId?: string | null
): FollowUpCategory {
  const dueNow =
    isFollowUpDue(client.nextFollowUpAt, timeZoneId) ||
    (client.leadStatus === "new" && client.lastOutreachAt == null);

  if (dueNow) {
    return "due-now";
  }
  if (client.leadStatus === "inactive") {
    return "at-risk";
  }
  if (client.leadStatus === "contacted" || client.leadStatus === "new") {
    return "opportunity";
  }
  return "healthy";
}

export function emptyFollowUpCategoryCounts(): FollowUpCategoryCounts {
  return {
    "due-now": 0,
    "at-risk": 0,
    opportunity: 0,
    healthy: 0,
  };
}

export function countFollowUpCategories(
  clients: Array<Pick<ClientListItem, "leadStatus" | "nextFollowUpAt" | "lastOutreachAt">>,
  timeZoneId?: string | null
): FollowUpCategoryCounts {
  const counts = emptyFollowUpCategoryCounts();
  for (const client of clients) {
    counts[resolveFollowUpCategory(client, timeZoneId)] += 1;
  }
  return counts;
}

export function needsAttentionCount(counts: FollowUpCategoryCounts): number {
  return counts["due-now"] + counts["at-risk"] + counts.opportunity;
}

export function countsFromFollowUpResponse(counts: {
  dueNowCount: number;
  atRiskCount: number;
  opportunityCount: number;
  healthyCount: number;
}): FollowUpCategoryCounts {
  return {
    "due-now": counts.dueNowCount,
    "at-risk": counts.atRiskCount,
    opportunity: counts.opportunityCount,
    healthy: counts.healthyCount,
  };
}

export function uniqueFollowUpItems<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

export function classifyFollowUpListState(input: {
  loading: boolean;
  errorKind: "none" | "recoverable" | "permission";
  needsAttentionCount: number;
  selectedCount: number;
}): FollowUpListState {
  if (input.loading) {
    return "loading";
  }
  if (input.errorKind === "permission") {
    return "permission";
  }
  if (input.errorKind === "recoverable") {
    return "error";
  }
  if (input.selectedCount > 0) {
    return "populated";
  }
  if (input.needsAttentionCount === 0) {
    return "global-empty";
  }
  return "filter-empty";
}

export function classifyFollowUpFetchFailure(
  error: unknown
): "permission" | "recoverable" {
  return error instanceof FollowUpAccessError ? "permission" : "recoverable";
}

function recordedOutreachCaption(client: ClientListItem): string {
  if (!client.lastOutreachAt) {
    return "No recorded outreach";
  }

  const caption = formatLastOutreachCaption(client);
  if (caption === "Never") {
    return `Last recorded outreach · ${formatNextFollowUpDate(client.lastOutreachAt)}`;
  }

  return `Last recorded outreach · ${caption}`;
}

export function followUpContextCaption(
  client: ClientListItem,
  category: FollowUpCategory,
  timeZoneId?: string | null
): string {
  if (category === "due-now") {
    if (isFollowUpDue(client.nextFollowUpAt, timeZoneId)) {
      return `Follow-up due · ${formatNextFollowUpDate(client.nextFollowUpAt, timeZoneId)}`;
    }
    return client.lastActivityName
      ? formatLastActivityCaption(client)
      : "No outreach yet";
  }

  if (category === "at-risk") {
    return recordedOutreachCaption(client);
  }

  if (category === "opportunity") {
    if (client.nextFollowUpAt && !isFollowUpDue(client.nextFollowUpAt, timeZoneId)) {
      return `Next follow-up · ${formatNextFollowUpDate(client.nextFollowUpAt, timeZoneId)}`;
    }
    return client.lastActivityName
      ? formatLastActivityCaption(client)
      : "Next conversation not scheduled";
  }

  if (client.lastOutreachAt) {
    return recordedOutreachCaption(client);
  }
  return client.lastActivityName
    ? formatLastActivityCaption(client)
    : "Current";
}

export type FollowUpPageResult = {
  items: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  counts: FollowUpCategoryCounts;
};

export async function loadFollowUpPage(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  input: {
    category: FollowUpCategory;
    page?: number;
    pageSize?: number;
  }
): Promise<FollowUpPageResult> {
  const guardedFetch = async (inputUrl: string, init?: RequestInit) => {
    const response = await authFetch(inputUrl, init);
    if (response.status === 401 || response.status === 403) {
      throw new FollowUpAccessError();
    }
    return response;
  };

  const result = await fetchClients(guardedFetch, {
    page: input.page ?? FOLLOW_UP_DEFAULT_PAGE,
    pageSize: input.pageSize ?? FOLLOW_UP_PAGE_SIZE,
    sortBy: "lastRegistrationDate",
    sortDirection: "desc",
    followUpCategory: input.category,
  });

  if (!result.followUpCategoryCounts) {
    throw new Error("Could not load Follow-up category totals.");
  }

  const counts = countsFromFollowUpResponse(result.followUpCategoryCounts);
  const items = uniqueFollowUpItems(result.items);
  if (items.length !== result.items.length) {
    throw new Error("Follow-up page contained duplicate clients.");
  }

  const requestedPage = input.page ?? FOLLOW_UP_DEFAULT_PAGE;
  if (
    items.length === 0 &&
    requestedPage <= FOLLOW_UP_DEFAULT_PAGE &&
    (result.totalCount > 0 || counts[input.category] > 0)
  ) {
    throw new Error("Follow-up page was empty while category totals were non-zero.");
  }

  return {
    items,
    page: result.page,
    pageSize: result.pageSize,
    totalCount: result.totalCount,
    counts,
  };
}
