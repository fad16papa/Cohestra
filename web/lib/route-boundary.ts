export const ROUTE_NOT_FOUND_H1 = "Page not found";
export const ROUTE_ERROR_H1 = "This screen failed";
export const ROUTE_OFFLINE_H1 = "You're offline";

export const ROUTE_ERROR_COPY =
  "Something broke on this screen. Reload. If it repeats, contact support.";
export const ROUTE_OFFLINE_COPY =
  "You're offline. We'll retry when the connection returns.";

export const ROUTE_RETRY_LABEL = "Try again";

export type RouteBoundaryKind = "not-found" | "error" | "offline";
export type RouteBoundarySurface =
  | "admin"
  | "marketing"
  | "platform"
  | "public"
  | "embed"
  | "global";

export type RouteRecovery = {
  href: string;
  label: string;
};

const NOT_FOUND_COPY: Record<RouteBoundarySurface, string> = {
  admin: "This page isn't in this workspace. Open Dashboard.",
  marketing: "This page isn't on Cohestra. Open the home page.",
  platform: "This page isn't in the platform console. Open Platform home.",
  public: "This page isn't on Cohestra. Open the home page.",
  embed: "This page isn't on Cohestra. Open the home page.",
  global: "This page isn't on Cohestra. Open the home page.",
};

const RECOVERY: Record<RouteBoundarySurface, RouteRecovery> = {
  admin: { href: "/dashboard", label: "Dashboard" },
  marketing: { href: "/", label: "Home" },
  platform: { href: "/platform", label: "Platform home" },
  public: { href: "/", label: "Home" },
  embed: { href: "/", label: "Home" },
  global: { href: "/", label: "Home" },
};

export const ADMIN_PATH_PREFIXES = [
  "/dashboard",
  "/clients",
  "/activities",
  "/settings",
  "/campaigns",
  "/analytics",
  "/ai",
  "/follow-up",
  "/billing",
  "/reports",
  "/intelligence",
  "/needs-attention",
] as const;

export function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function routeBoundarySurfaceFromPath(pathname: string): RouteBoundarySurface {
  if (pathMatchesPrefix(pathname, "/platform")) {
    return "platform";
  }
  if (pathMatchesPrefix(pathname, "/embed")) {
    return "embed";
  }
  if (pathMatchesPrefix(pathname, "/register")) {
    return "public";
  }
  if (ADMIN_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return "admin";
  }
  return "marketing";
}

export function routeBoundaryHeading(kind: RouteBoundaryKind): string {
  if (kind === "not-found") {
    return ROUTE_NOT_FOUND_H1;
  }
  if (kind === "offline") {
    return ROUTE_OFFLINE_H1;
  }
  return ROUTE_ERROR_H1;
}

export function routeBoundaryCopy(
  kind: RouteBoundaryKind,
  surface: RouteBoundarySurface
): string {
  if (kind === "not-found") {
    return NOT_FOUND_COPY[surface];
  }
  if (kind === "offline") {
    return ROUTE_OFFLINE_COPY;
  }
  return ROUTE_ERROR_COPY;
}

export function routeBoundaryRecovery(surface: RouteBoundarySurface): RouteRecovery {
  return RECOVERY[surface];
}

export function routeBoundaryOwnsMain(surface: RouteBoundarySurface): boolean {
  return surface === "marketing" || surface === "embed" || surface === "global";
}

export function routeBoundaryUsesPublicTouch(surface: RouteBoundarySurface): boolean {
  return surface !== "admin";
}

export function isForceErrorBlocked(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === "production";
}

export const E2E_FORCE_ERROR_MESSAGE = "e2e-forced-route-error";

export type ConnectivityAutoResetInput = {
  wasOnline: boolean;
  isOnline: boolean;
  hasAutoReset: boolean;
};

/** First offline-to-online transition only. Never on an already-online mount. */
export function shouldAutoResetOnReconnect({
  wasOnline,
  isOnline,
  hasAutoReset,
}: ConnectivityAutoResetInput): boolean {
  return !wasOnline && isOnline && !hasAutoReset;
}
