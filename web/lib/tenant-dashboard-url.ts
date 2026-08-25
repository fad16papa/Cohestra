/** Browser host used to build tenant workspace URLs after login / signup / invite. */
export type PublicHostLocation = {
  hostname: string;
  protocol: string;
  port: string;
  origin: string;
};

/** Local Docker nginx HTTP port when the browser is on an HTTPS tunnel (no :port in the URL). */
const LOCAL_DOCKER_HTTP_PORT = "8088";

/**
 * Free HTTPS tunnels used for local Paddle sandbox return/webhooks.
 * These hosts are not tenant DNS; nginx still routes tenants on `{slug}.localhost`.
 */
export function isHttpsDevTunnelHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) {
    return false;
  }

  if (/(^|\.)ngrok(-free)?\.(dev|app|io)$/.test(host)) {
    return true;
  }

  return host.endsWith(".trycloudflare.com") || host.endsWith(".loca.lt");
}

/** HTTP port for `{slug}.localhost` when rewriting off a tunnel or a localhost API URL. */
export function localDockerHttpPortFromApiUrl(apiUrl?: string | null): string {
  const raw = apiUrl?.trim();
  if (!raw) {
    return LOCAL_DOCKER_HTTP_PORT;
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return url.port || LOCAL_DOCKER_HTTP_PORT;
    }
  } catch {
    // ignore malformed env
  }

  return LOCAL_DOCKER_HTTP_PORT;
}

/** Canonical local-docker tenant dashboard. Always HTTP — nginx on 8088 has no TLS. */
export function buildLocalDockerTenantDashboardUrl(
  slug: string,
  apiUrl?: string | null
): string {
  const safeSlug = slug.trim().toLowerCase();
  const port = localDockerHttpPortFromApiUrl(apiUrl);
  const portSuffix = port && port !== "80" ? `:${port}` : "";
  return `http://${safeSlug}.localhost${portSuffix}/dashboard`;
}

function readWindowLocation(): PublicHostLocation | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port,
    origin: window.location.origin,
  };
}

/**
 * Tenant dashboard origin for post-login handoff.
 * HTTPS tunnels (ngrok / cloudflared / loca.lt) are local-docker apex, not production.
 * Never send a local UAT session to `{slug}.cohestra.app`.
 */
export function buildTenantDashboardUrl(
  slug: string,
  location?: PublicHostLocation,
  apiUrl?: string | null
): string {
  const safeSlug = slug.trim().toLowerCase();
  const host = location ?? readWindowLocation();
  const resolvedApiUrl = apiUrl ?? process.env.NEXT_PUBLIC_API_URL;

  if (host) {
    const hostname = host.hostname.toLowerCase();
    const portSuffix = host.port ? `:${host.port}` : "";

    if (isHttpsDevTunnelHost(hostname)) {
      return buildLocalDockerTenantDashboardUrl(safeSlug, resolvedApiUrl);
    }

    if (hostname.endsWith(".nip.io")) {
      const nipHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
      const parts = nipHost.split(".");
      // Tenant host: slug.129-212-235-2.nip.io (4 labels)
      if (parts.length >= 4) {
        return `${host.origin}/dashboard`;
      }

      // Marketing apex: 129-212-235-2.nip.io (3 labels)
      if (parts.length === 3) {
        return `${host.protocol}//${safeSlug}.${parts[0]}.nip.io/dashboard`;
      }
    }

    if (
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname.endsWith(".localhost")
    ) {
      return `${host.protocol}//${safeSlug}.localhost${portSuffix}/dashboard`;
    }

    if (hostname.endsWith(".cohestra.app")) {
      const apex =
        hostname === "cohestra.app" || hostname === "www.cohestra.app"
          ? "cohestra.app"
          : hostname.split(".").slice(-2).join(".");
      return `https://${safeSlug}.${apex}/dashboard`;
    }
  }

  return `https://${safeSlug}.cohestra.app/dashboard`;
}
