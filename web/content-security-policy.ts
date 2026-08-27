/**
 * Baseline Content-Security-Policy for the Cohestra web app.
 *
 * v2 ships **enforce** mode after launch checklist CSP audit (Aug 2026).
 * Report-only variants remain exported for staged rollouts.
 *
 * Production: nginx adds this header (deploy/nginx/app.conf, app-ssl.conf.template).
 * Development: Next.js adds it when nginx is not in front (next.config.ts).
 */

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://buy.paddle.com https://sandbox-buy.paddle.com",
  "frame-ancestors 'none'",
  "frame-src https://www.google.com https://www.recaptcha.net https://www.youtube-nocookie.com https://player.vimeo.com https://buy.paddle.com https://sandbox-buy.paddle.com",
] as const;

/** Production / Docker (nginx-owned). API calls are same-origin via /api/ proxy. */
export const contentSecurityPolicyValue = [
  ...BASE_DIRECTIVES,
  "connect-src 'self' https://nominatim.openstreetmap.org https://api.paddle.com https://sandbox-api.paddle.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
].join("; ");

/** Local `next dev` — allow HMR websockets. */
export const contentSecurityPolicyDevValue = [
  ...BASE_DIRECTIVES,
  "connect-src 'self' ws: wss: https://nominatim.openstreetmap.org https://api.paddle.com https://sandbox-api.paddle.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
].join("; ");

/** @deprecated Use contentSecurityPolicyHeader — kept for staged rollback. */
export const contentSecurityPolicyReportOnlyValue = contentSecurityPolicyValue;

/** @deprecated Use contentSecurityPolicyDevHeader. */
export const contentSecurityPolicyReportOnlyDevValue = contentSecurityPolicyDevValue;

export const contentSecurityPolicyHeader = {
  key: "Content-Security-Policy",
  value: contentSecurityPolicyValue,
} as const;

export const contentSecurityPolicyDevHeader = {
  key: "Content-Security-Policy",
  value: contentSecurityPolicyDevValue,
} as const;

export const contentSecurityPolicyReportOnlyHeader = {
  key: "Content-Security-Policy-Report-Only",
  value: contentSecurityPolicyValue,
} as const;

export const contentSecurityPolicyReportOnlyDevHeader = {
  key: "Content-Security-Policy-Report-Only",
  value: contentSecurityPolicyDevValue,
} as const;

/** Nginx `add_header` value — keep in sync with contentSecurityPolicyValue. */
export const nginxContentSecurityPolicy = contentSecurityPolicyValue;

/** @deprecated Use nginxContentSecurityPolicy. */
export const nginxContentSecurityPolicyReportOnly = contentSecurityPolicyValue;
