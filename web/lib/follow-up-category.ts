import {
  fetchClients,
  formatLastActivityCaption,
  formatLastOutreachCaption,
  formatNextFollowUpDate,
  isFollowUpDue,
  type ClientListItem,
} from "@/lib/clients-api";
import { FOLLOW_UP_PATH } from "@/lib/admin-canonical-routes";

export type FollowUpCategory = "due-now" | "at-risk" | "opportunity" | "healthy";

export const FOLLOW_UP_CATEGORY_QUERY_KEY = "category";
export const FOLLOW_UP_DEFAULT_CATEGORY: FollowUpCategory = "due-now";
export const FOLLOW_UP_PAGE_SIZE = 100;

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

export function followUpHrefForCategory(
  category: FollowUpCategory,
  currentSearch = ""
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

  input.replace?.(followUpHrefForCategory(input.category, input.liveSearch));
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

export async function loadFollowUpClients(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<ClientListItem[]> {
  const guardedFetch = async (input: string, init?: RequestInit) => {
    const response = await authFetch(input, init);
    if (response.status === 401 || response.status === 403) {
      throw new FollowUpAccessError();
    }
    return response;
  };

  const merged = new Map<string, ClientListItem>();
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while ((page - 1) * FOLLOW_UP_PAGE_SIZE < totalCount) {
    const result = await fetchClients(guardedFetch, {
      page,
      pageSize: FOLLOW_UP_PAGE_SIZE,
      sortBy: "lastRegistrationDate",
      sortDirection: "desc",
    });

    for (const client of result.items) {
      merged.set(client.id, client);
    }

    totalCount = result.totalCount;
    if (result.items.length < result.pageSize) {
      break;
    }
    page += 1;
  }

  if (merged.size < totalCount) {
    throw new Error("Could not load the complete Follow-up list.");
  }

  return Array.from(merged.values());
}
