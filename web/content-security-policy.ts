/**
 * Baseline Content-Security-Policy (report-only) for the Cohestra web app.
 *
 * v1 ships report-only so violations are visible in DevTools without blocking
 * Next.js inline scripts/styles. Tighten directives and switch to enforce mode
 * after reviewing violation reports (see docs/deploy/enterprise-launch-checklist.md).
 *
 * Production: nginx adds this header (deploy/nginx/app.conf, app-ssl.conf.template).
 * Development: Next.js adds it when nginx is not in front (next.config.ts).
 */

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src https://www.google.com https://www.recaptcha.net https://www.youtube-nocookie.com https://player.vimeo.com",
] as const;

/** Production / Docker (nginx-owned). API calls are same-origin via /api/ proxy. */
export const contentSecurityPolicyReportOnlyValue = [
  ...BASE_DIRECTIVES,
  "connect-src 'self' https://nominatim.openstreetmap.org",
].join("; ");

/** Local `next dev` — allow HMR websockets. */
export const contentSecurityPolicyReportOnlyDevValue = [
  ...BASE_DIRECTIVES,
  "connect-src 'self' ws: wss: https://nominatim.openstreetmap.org",
].join("; ");

export const contentSecurityPolicyReportOnlyHeader = {
  key: "Content-Security-Policy-Report-Only",
  value: contentSecurityPolicyReportOnlyValue,
} as const;

export const contentSecurityPolicyReportOnlyDevHeader = {
  key: "Content-Security-Policy-Report-Only",
  value: contentSecurityPolicyReportOnlyDevValue,
} as const;

/** Nginx `add_header` value — keep in sync with contentSecurityPolicyReportOnlyValue. */
export const nginxContentSecurityPolicyReportOnly =
  contentSecurityPolicyReportOnlyValue;
