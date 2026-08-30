/**
 * Baseline Content-Security-Policy for the Cohestra web app.
 *
 * v2 ships **enforce** mode after launch checklist CSP audit (Aug 2026).
 * Report-only variants remain exported for staged rollouts.
 *
 * Production: nginx adds this header (deploy/nginx/app.conf, app-ssl.conf.template).
 * Development: Next.js adds it when nginx is not in front (next.config.ts).
 *
 * Story 32.1: `/embed/*` routes override `frame-ancestors` per tenant allow-list via middleware.
 */

export type ContentSecurityPolicyOptions = {
  frameAncestors?: readonly string[];
};

const PRODUCTION_CONNECT_SRC =
  "connect-src 'self' https://nominatim.openstreetmap.org https://api.paddle.com https://sandbox-api.paddle.com https://cdn.paddle.com https://sandbox-cdn.paddle.com";

const DEV_CONNECT_SRC =
  "connect-src 'self' ws: wss: https://nominatim.openstreetmap.org https://api.paddle.com https://sandbox-api.paddle.com https://cdn.paddle.com https://sandbox-cdn.paddle.com";

function buildFrameAncestorsDirective(frameAncestors?: readonly string[]): string {
  if (!frameAncestors || frameAncestors.length === 0) {
    return "frame-ancestors 'none'";
  }

  return `frame-ancestors 'self' ${frameAncestors.join(" ")}`;
}

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
  connectSrc: string = PRODUCTION_CONNECT_SRC
): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://buy.paddle.com https://sandbox-buy.paddle.com",
    buildFrameAncestorsDirective(options.frameAncestors),
    "frame-src https://www.google.com https://www.recaptcha.net https://www.youtube-nocookie.com https://player.vimeo.com https://buy.paddle.com https://sandbox-buy.paddle.com",
    connectSrc,
  ];

  return directives.join("; ");
}

/** Production / Docker (nginx-owned). API calls are same-origin via /api/ proxy. */
export const contentSecurityPolicyValue = buildContentSecurityPolicy();

/** Local `next dev` — allow HMR websockets. */
export const contentSecurityPolicyDevValue = buildContentSecurityPolicy({}, DEV_CONNECT_SRC);

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

/** Nginx embed route note: global policy stays `'none'`; tenant allow-list is Next-owned on `/embed/*`. */
export function nginxContentSecurityPolicyForEmbed(origins: readonly string[]): string {
  return buildContentSecurityPolicy({ frameAncestors: origins });
}

/** @deprecated Use nginxContentSecurityPolicy. */
export const nginxContentSecurityPolicyReportOnly = contentSecurityPolicyValue;

export function buildEmbedContentSecurityPolicy(
  origins: readonly string[],
  isDev: boolean = process.env.NODE_ENV === "development"
): string {
  return buildContentSecurityPolicy(
    { frameAncestors: origins },
    isDev ? DEV_CONNECT_SRC : PRODUCTION_CONNECT_SRC
  );
}
