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

export type PaddleCspMode = "all" | "live" | "sandbox";

export type ContentSecurityPolicyOptions = {
  frameAncestors?: readonly string[];
  paddleMode?: PaddleCspMode;
};

const LIVE_PADDLE_SCRIPT = "https://cdn.paddle.com";
const SANDBOX_PADDLE_SCRIPT = "https://sandbox-cdn.paddle.com";
const LIVE_PADDLE_BUY = "https://buy.paddle.com";
const SANDBOX_PADDLE_BUY = "https://sandbox-buy.paddle.com";
const LIVE_PADDLE_API = "https://api.paddle.com";
const SANDBOX_PADDLE_API = "https://sandbox-api.paddle.com";

function paddleHosts(mode: PaddleCspMode): {
  script: string;
  img: string;
  form: string;
  frame: string;
  connect: string;
} {
  const live = {
    script: LIVE_PADDLE_SCRIPT,
    img: LIVE_PADDLE_SCRIPT,
    form: LIVE_PADDLE_BUY,
    frame: LIVE_PADDLE_BUY,
    connect: `${LIVE_PADDLE_API} ${LIVE_PADDLE_SCRIPT}`,
  };
  const sandbox = {
    script: SANDBOX_PADDLE_SCRIPT,
    img: SANDBOX_PADDLE_SCRIPT,
    form: SANDBOX_PADDLE_BUY,
    frame: SANDBOX_PADDLE_BUY,
    connect: `${SANDBOX_PADDLE_API} ${SANDBOX_PADDLE_SCRIPT}`,
  };

  if (mode === "live") {
    return live;
  }

  if (mode === "sandbox") {
    return sandbox;
  }

  return {
    script: `${live.script} ${sandbox.script}`,
    img: `${live.img} ${sandbox.img}`,
    form: `${live.form} ${sandbox.form}`,
    frame: `${live.frame} ${sandbox.frame}`,
    connect: `${LIVE_PADDLE_API} ${SANDBOX_PADDLE_API} ${LIVE_PADDLE_SCRIPT} ${SANDBOX_PADDLE_SCRIPT}`,
  };
}

function connectSrcFor(mode: PaddleCspMode, isDev: boolean): string {
  const paddle = paddleHosts(mode).connect;
  if (isDev) {
    return `connect-src 'self' http://localhost:8080 ws: wss: https://nominatim.openstreetmap.org ${paddle}`;
  }

  return `connect-src 'self' https://nominatim.openstreetmap.org ${paddle}`;
}

function buildFrameAncestorsDirective(frameAncestors?: readonly string[]): string {
  if (!frameAncestors || frameAncestors.length === 0) {
    return "frame-ancestors 'none'";
  }

  return `frame-ancestors ${frameAncestors.join(" ")}`;
}

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
  connectSrc?: string
): string {
  const paddleMode = options.paddleMode ?? "all";
  const paddle = paddleHosts(paddleMode);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com ${paddle.script}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https://images.unsplash.com ${paddle.img}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${paddle.form}`,
    buildFrameAncestorsDirective(options.frameAncestors),
    `frame-src https://www.google.com https://www.recaptcha.net https://www.youtube-nocookie.com https://player.vimeo.com ${paddle.frame}`,
    connectSrc ?? connectSrcFor(paddleMode, false),
  ];

  return directives.join("; ");
}

/** Production / Docker (nginx-owned). API calls are same-origin via /api/ proxy. */
export const contentSecurityPolicyValue = buildContentSecurityPolicy();

/** Production live Paddle — sandbox hosts are not required. */
export const contentSecurityPolicyProductionLiveValue = buildContentSecurityPolicy({
  paddleMode: "live",
});

/** Local `next dev` — allow HMR websockets. */
export const contentSecurityPolicyDevValue = buildContentSecurityPolicy(
  {},
  connectSrcFor("all", true)
);

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

/** Nginx Production live-Paddle CSP — sandbox hosts omitted. Adopt at 46.10 live cutover. */
export const nginxContentSecurityPolicyProductionLive =
  contentSecurityPolicyProductionLiveValue;

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
    connectSrcFor("all", isDev)
  );
}
