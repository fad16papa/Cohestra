export const DASHBOARD_PATH = "/dashboard";
export const CLIENTS_PATH = "/clients";
export const ACTIVITIES_PATH = "/activities";
export const FOLLOW_UP_PATH = "/follow-up";
export const ANALYTICS_PATH = "/analytics";
export const AI_PATH = "/ai";
export const WEBSITE_PATH = "/dashboard/website";
export const CAMPAIGNS_PATH = "/campaigns";
export const REPORTS_COMPAT_PATH = "/reports";
export const SETTINGS_PATH = "/settings";
export const SETTINGS_PROFILE_PATH = "/settings/profile";
export const SETTINGS_TEAM_PATH = "/settings/team";
export const SETTINGS_BILLING_PATH = "/settings/billing";

export const AI_COMPAT_PATHS = ["/intelligence", "/needs-attention"] as const;

type SearchParamValue = string | string[] | undefined;

export function searchParamsToQueryString(
  searchParams: Record<string, SearchParamValue>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    } else if (value != null && value !== "") {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function pathWithQuery(pathname: string, queryString: string): string {
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

export function analyticsHref(queryString = ""): string {
  return pathWithQuery(ANALYTICS_PATH, queryString.replace(/^\?/, ""));
}

export function isAnalyticsPath(pathname: string): boolean {
  return (
    pathname === ANALYTICS_PATH ||
    pathname.startsWith(`${ANALYTICS_PATH}/`) ||
    pathname === REPORTS_COMPAT_PATH ||
    pathname.startsWith(`${REPORTS_COMPAT_PATH}/`)
  );
}

export function isAiPath(pathname: string): boolean {
  return (
    pathname === AI_PATH ||
    pathname.startsWith(`${AI_PATH}/`) ||
    AI_COMPAT_PATHS.some(
      (compat) => pathname === compat || pathname.startsWith(`${compat}/`)
    )
  );
}

export function isFollowUpPath(pathname: string): boolean {
  return pathname === FOLLOW_UP_PATH || pathname.startsWith(`${FOLLOW_UP_PATH}/`);
}

export function destinationWithSearch(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  return pathWithQuery(pathname, searchParamsToQueryString(searchParams));
}

export function isSettingsProfilePath(pathname: string): boolean {
  return (
    pathname === SETTINGS_PATH ||
    pathname === SETTINGS_PROFILE_PATH ||
    (pathname.startsWith(`${SETTINGS_PATH}/`) &&
      !pathname.startsWith(SETTINGS_TEAM_PATH) &&
      !pathname.startsWith(SETTINGS_BILLING_PATH))
  );
}
