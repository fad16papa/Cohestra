import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  buildEmbedRouteSecurityHeaders,
  fetchPublicEmbedOrigins,
  isEmbedPath,
} from "@/lib/embed-csp";
import { resolvePaddleApexReturnRedirectUrl } from "@/lib/billing/paddle-return";
import {
  requestOriginFromHeaders,
  resolvePlatformOpsRedirectUrl,
} from "@/lib/platform-ops-host";

/** Preserve Host for downstream server components (Story 15.1). */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const origin = requestOriginFromHeaders(host, proto, request.nextUrl.origin);
  const paddleReturnRedirect = resolvePaddleApexReturnRedirectUrl(
    origin,
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("_ptxn")
  );
  if (paddleReturnRedirect) {
    return NextResponse.redirect(paddleReturnRedirect, 307);
  }

  const platformRedirect = resolvePlatformOpsRedirectUrl(
    origin,
    request.nextUrl.pathname,
    request.nextUrl.search
  );

  if (platformRedirect) {
    return NextResponse.redirect(platformRedirect, 307);
  }

  const requestHeaders = new Headers(request.headers);
  if (host) {
    requestHeaders.set("x-forwarded-host", host);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isEmbedPath(request.nextUrl.pathname)) {
    const origins = await fetchPublicEmbedOrigins(request);
    const embedHeaders = buildEmbedRouteSecurityHeaders(origins);
    for (const [key, value] of Object.entries(embedHeaders)) {
      response.headers.set(key, value);
    }

    // CSP frame-ancestors takes precedence; omit DENY so parent frames can embed when allowed.
    response.headers.delete("X-Frame-Options");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
