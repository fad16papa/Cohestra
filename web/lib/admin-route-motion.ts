/** Pathname-only identity for admin shell route enter motion. */

export const ADMIN_ROUTE_ENTER_CLASS = "animate-page-enter";

export function adminRouteTransitionKey(pathname: string): string {
  const trimmed = pathname.trim();
  const withoutHash = trimmed.split("#", 1)[0] ?? trimmed;
  const withoutQuery = withoutHash.split("?", 1)[0] ?? withoutHash;
  return withoutQuery.length > 0 ? withoutQuery : "/";
}
