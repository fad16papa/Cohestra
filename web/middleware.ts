import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Preserve Host for downstream server components (Story 15.1). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const host = request.headers.get("host");
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
