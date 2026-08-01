/**
 * Baseline security headers for the Next.js app.
 *
 * Production Docker/UAT serves traffic through nginx (deploy/nginx/app.conf and
 * app-ssl.conf.template), which owns these headers on the public edge.
 * Next.js emits them only for `next dev` when nginx is not in front.
 */
export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

/** True when Next.js should attach security headers (local dev without nginx). */
export function shouldNextJsEmitSecurityHeaders(): boolean {
  return process.env.NODE_ENV === "development";
}
