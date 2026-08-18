import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  requestOriginFromHeaders,
  resolvePlatformOpsRedirectUrl,
} from "@/lib/platform-ops-host";

/** Preserve Host for downstream server components (Story 15.1). */
export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const origin = requestOriginFromHeaders(host, proto, request.nextUrl.origin);
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

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
