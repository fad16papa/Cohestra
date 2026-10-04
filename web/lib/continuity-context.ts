import {
  ACTIVITIES_PATH,
  CLIENTS_PATH,
  DASHBOARD_PATH,
  FOLLOW_UP_PATH,
} from "@/lib/admin-canonical-routes";
import {
  dashboardHrefForView,
  isDashboardViewMode,
  type DashboardViewMode,
} from "@/lib/dashboard-view-mode";
import {
  FOLLOW_UP_DEFAULT_PAGE,
  followUpHrefForCategory,
  isFollowUpCategory,
  type FollowUpCategory,
} from "@/lib/follow-up-category";

export const CONTINUITY_QUERY_KEY = "ctx";
export const CONTINUITY_MAX_LENGTH = 512;

export type ContinuityContext =
  | { room: "dashboard"; view: DashboardViewMode; clientId?: string }
  | { room: "follow-up"; category: FollowUpCategory; page: number; clientId?: string }
  | { room: "clients"; query: string; clientId?: string }
  | { room: "activities"; query: string; clientId?: string }
  | { room: "activity"; activityId: string; tab?: ActivityContinuityTab; clientId?: string };

export type ActivityContinuityTab =
  | "overview"
  | "design"
  | "form"
  | "registrations"
  | "share";

export type ContinuityCrumb = {
  label: string;
  href?: string;
  current?: boolean;
};

const CLIENTS_QUERY_KEYS = new Set([
  "search",
  "leadStatus",
  "nationality",
  "followUpDue",
  "mergeSuspect",
  "createdWithinDays",
  "registeredWithinDays",
  "activityId",
  "activityName",
  "sortBy",
  "sortDir",
  "page",
]);

const ACTIVITIES_QUERY_KEYS = new Set([
  "status",
  "search",
  "category",
  "community",
  "sortBy",
  "sortDirection",
  "page",
]);

const ACTIVITY_TABS = new Set<ActivityContinuityTab>([
  "overview",
  "design",
  "form",
  "registrations",
  "share",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob):/i;
const ADMIN_PREFIXES = [
  DASHBOARD_PATH,
  CLIENTS_PATH,
  ACTIVITIES_PATH,
  FOLLOW_UP_PATH,
  "/analytics",
  "/ai",
  "/campaigns",
  "/settings",
];

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isActivityTab(value: string | null | undefined): value is ActivityContinuityTab {
  return value != null && ACTIVITY_TABS.has(value as ActivityContinuityTab);
}

function decodeRepeated(value: string, times = 3): string {
  let current = value;
  for (let i = 0; i < times; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) {
        break;
      }
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function compactDecoded(value: string): string {
  return decodeRepeated(value).trim().replace(/\\/g, "/").replace(/[\s\u0000-\u001f]/g, "");
}

function looksLikeLeadingLocation(value: string): boolean {
  const compact = compactDecoded(value);
  if (BLOCKED_SCHEMES.test(compact)) {
    return true;
  }
  if (/^(https?|mailto):/i.test(compact)) {
    return true;
  }
  return compact.startsWith("//");
}

function looksLikeExternalLocation(value: string): boolean {
  const compact = compactDecoded(value);
  return looksLikeLeadingLocation(value) || /:\/\//.test(compact);
}

function looksLikeSensitiveContact(value: string): boolean {
  const compact = compactDecoded(value);
  return compact.includes("@") && compact.includes(".");
}

function looksExternal(value: string): boolean {
  return looksLikeExternalLocation(value) || looksLikeSensitiveContact(value);
}

function allowlistedQuery(raw: string, allowed: Set<string>): string | null {
  if (!raw) {
    return "";
  }
  if (raw.length > CONTINUITY_MAX_LENGTH) {
    return null;
  }
  if (looksLikeLeadingLocation(raw)) {
    return null;
  }
  const params = new URLSearchParams(raw);
  const next = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (!allowed.has(key)) {
      continue;
    }
    if (!value || looksExternal(value) || value.length > 120) {
      continue;
    }
    if ((key === "activityId" || key === "activityName") && /@|:\/\//.test(value)) {
      continue;
    }
    if (key === "page") {
      const page = Number.parseInt(value, 10);
      if (!Number.isInteger(page) || page < 1 || page > 1000) {
        continue;
      }
    }
    next.set(key, value);
  }
  return next.toString();
}

export function normalizeInternalReturnPath(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > CONTINUITY_MAX_LENGTH) {
    return null;
  }
  if (looksExternal(trimmed)) {
    return null;
  }
  const decoded = decodeRepeated(trimmed);
  if (looksExternal(decoded) || !decoded.startsWith("/") || decoded.startsWith("//")) {
    return null;
  }
  const [pathname, query = ""] = decoded.split("?");
  if (!pathname || pathname.includes("\\") || pathname.includes("..")) {
    return null;
  }
  if (!ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }
  if (query && looksExternal(query)) {
    return null;
  }
  return query ? `${pathname}?${query}` : pathname;
}

export function parseContinuityContext(raw: string | null | undefined): ContinuityContext | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > CONTINUITY_MAX_LENGTH || looksLikeLeadingLocation(trimmed)) {
    return null;
  }

  const [head, ...viaParts] = trimmed.split("~");
  let clientId: string | undefined;
  for (const via of viaParts) {
    if (via.startsWith("c:") && isUuid(via.slice(2))) {
      clientId = via.slice(2);
    }
  }

  const colon = head.indexOf(":");
  if (colon < 0) {
    return null;
  }
  const room = head.slice(0, colon);
  const rest = head.slice(colon + 1);
  if (looksLikeLeadingLocation(rest)) {
    return null;
  }

  if (room === "d") {
    if (!isDashboardViewMode(rest)) {
      return null;
    }
    return { room: "dashboard", view: rest, clientId };
  }

  if (room === "fu") {
    const [category, pageRaw] = rest.split(":");
    if (!isFollowUpCategory(category)) {
      return null;
    }
    const page = pageRaw ? Number.parseInt(pageRaw, 10) : FOLLOW_UP_DEFAULT_PAGE;
    if (!Number.isInteger(page) || page < 1 || page > 1000) {
      return null;
    }
    return { room: "follow-up", category, page, clientId };
  }

  if (room === "cl") {
    const query = allowlistedQuery(rest, CLIENTS_QUERY_KEYS);
    if (query == null) {
      return null;
    }
    return { room: "clients", query, clientId };
  }

  if (room === "al") {
    const query = allowlistedQuery(rest, ACTIVITIES_QUERY_KEYS);
    if (query == null) {
      return null;
    }
    return { room: "activities", query, clientId };
  }

  if (room === "ac") {
    const [activityId, tab] = rest.split(":");
    if (!isUuid(activityId)) {
      return null;
    }
    if (tab && !isActivityTab(tab)) {
      return null;
    }
    return { room: "activity", activityId, tab: tab as ActivityContinuityTab | undefined, clientId };
  }

  return null;
}

export function serializeContinuityContext(context: ContinuityContext): string {
  let token = "";
  if (context.room === "dashboard") {
    token = `d:${context.view}`;
  } else if (context.room === "follow-up") {
    token =
      context.page > FOLLOW_UP_DEFAULT_PAGE
        ? `fu:${context.category}:${context.page}`
        : `fu:${context.category}`;
  } else if (context.room === "clients") {
    token = context.query ? `cl:${context.query}` : "cl:";
  } else if (context.room === "activities") {
    token = context.query ? `al:${context.query}` : "al:";
  } else {
    token = context.tab ? `ac:${context.activityId}:${context.tab}` : `ac:${context.activityId}`;
  }
  if (context.clientId && isUuid(context.clientId)) {
    token = `${token}~c:${context.clientId}`;
  }
  return token;
}

export function withClientVia(context: ContinuityContext, clientId: string): ContinuityContext {
  if (!isUuid(clientId)) {
    return context;
  }
  return { ...context, clientId };
}

export function hrefForContinuityContext(context: ContinuityContext): string {
  if (context.room === "dashboard") {
    return dashboardHrefForView(context.view);
  }
  if (context.room === "follow-up") {
    return followUpHrefForCategory(context.category, "", context.page);
  }
  if (context.room === "clients") {
    return context.query ? `${CLIENTS_PATH}?${context.query}` : CLIENTS_PATH;
  }
  if (context.room === "activities") {
    return context.query ? `${ACTIVITIES_PATH}?${context.query}` : ACTIVITIES_PATH;
  }
  return context.tab
    ? `${ACTIVITIES_PATH}/${context.activityId}?tab=${context.tab}`
    : `${ACTIVITIES_PATH}/${context.activityId}`;
}

export function labelForContinuityContext(context: ContinuityContext): string {
  if (context.room === "dashboard") {
    return "Dashboard";
  }
  if (context.room === "follow-up") {
    return "Follow-up";
  }
  if (context.room === "clients") {
    return "Clients";
  }
  if (context.room === "activities" || context.room === "activity") {
    return "Activities";
  }
  return "Dashboard";
}

export function fallbackHrefForPath(pathname: string): string {
  if (pathname.startsWith(`${CLIENTS_PATH}/`)) {
    return CLIENTS_PATH;
  }
  if (/^\/activities\/[0-9a-f-]{36}/i.test(pathname)) {
    return ACTIVITIES_PATH;
  }
  if (pathname.startsWith(`${ACTIVITIES_PATH}/`)) {
    return ACTIVITIES_PATH;
  }
  if (pathname.startsWith(FOLLOW_UP_PATH)) {
    return FOLLOW_UP_PATH;
  }
  return DASHBOARD_PATH;
}

export function readContinuityContext(search: string | URLSearchParams | null | undefined): ContinuityContext | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search ?? new URLSearchParams();
  return parseContinuityContext(params.get(CONTINUITY_QUERY_KEY));
}

export function appendContinuityContext(href: string, context: ContinuityContext | null): string {
  if (!context) {
    return href;
  }
  const token = serializeContinuityContext(context);
  if (!token || token.length > CONTINUITY_MAX_LENGTH) {
    return href;
  }
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(CONTINUITY_QUERY_KEY, token);
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}

export function clientsContextFromSearch(search: string): ContinuityContext {
  const query = allowlistedQuery(
    search.startsWith("?") ? search.slice(1) : search,
    CLIENTS_QUERY_KEYS
  );
  return { room: "clients", query: query ?? "" };
}

export function activitiesContextFromSearch(search: string): ContinuityContext {
  const query = allowlistedQuery(
    search.startsWith("?") ? search.slice(1) : search,
    ACTIVITIES_QUERY_KEYS
  );
  return { room: "activities", query: query ?? "" };
}

export function followUpContextFromSearch(search: string): ContinuityContext | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const parsed = parseContinuityContext(
    `fu:${params.get("category") ?? "due-now"}${params.get("page") ? `:${params.get("page")}` : ""}`
  );
  return parsed?.room === "follow-up" ? parsed : { room: "follow-up", category: "due-now", page: 1 };
}

export function dashboardContextFromSearch(search: string, storedView: DashboardViewMode = "overview"): ContinuityContext {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view = params.get("view");
  return {
    room: "dashboard",
    view: isDashboardViewMode(view) ? view : storedView,
  };
}

export function activityHrefForId(activityId: string, context: ContinuityContext | null, tab?: ActivityContinuityTab): string | null {
  if (!isUuid(activityId)) {
    return null;
  }
  const href = tab ? `${ACTIVITIES_PATH}/${activityId}?tab=${tab}` : `${ACTIVITIES_PATH}/${activityId}`;
  return appendContinuityContext(href, context);
}

export function clientHrefForId(clientId: string, context: ContinuityContext | null): string {
  if (!isUuid(clientId)) {
    return CLIENTS_PATH;
  }
  return appendContinuityContext(`${CLIENTS_PATH}/${clientId}`, context);
}

export function canonicalParentHref(pathname: string, context: ContinuityContext | null): string {
  if (context) {
    return hrefForContinuityContext(context);
  }
  return fallbackHrefForPath(pathname);
}

export function buildContinuityCrumbs(input: {
  pathname: string;
  search?: string;
  currentLabel: string;
}): ContinuityCrumb[] {
  const context = readContinuityContext(input.search ?? "");
  const crumbs: ContinuityCrumb[] = [];

  if (context) {
    crumbs.push({
      label: labelForContinuityContext(context),
      href: hrefForContinuityContext(context),
    });
    if (context.clientId && /^\/activities\/[0-9a-f-]{36}/i.test(input.pathname)) {
      crumbs.push({
        label: "Client",
        href: clientHrefForId(context.clientId, { ...context, clientId: undefined }),
      });
    }
  } else if (input.pathname.startsWith(`${CLIENTS_PATH}/`)) {
    crumbs.push({ label: "Clients", href: CLIENTS_PATH });
  } else if (/^\/activities\/[0-9a-f-]{36}/i.test(input.pathname)) {
    crumbs.push({ label: "Activities", href: ACTIVITIES_PATH });
  }

  crumbs.push({ label: input.currentLabel, current: true });
  return crumbs;
}

export function mobileBackAction(input: {
  pathname: string;
  search?: string;
}): { href: string; label: string } {
  const context = readContinuityContext(input.search ?? "");
  if (context) {
    return {
      href: hrefForContinuityContext(context),
      label: `Back to ${labelForContinuityContext(context)}`,
    };
  }
  const href = fallbackHrefForPath(input.pathname);
  const label =
    href === FOLLOW_UP_PATH
      ? "Back to Follow-up"
      : href === CLIENTS_PATH
        ? "Back to Clients"
        : href === ACTIVITIES_PATH
          ? "Back to Activities"
          : "Back to Dashboard";
  return { href, label };
}
