import fs from "node:fs";
import path from "node:path";

export type ContrastThreshold = 4.5 | 3;

export type ContrastPair = {
  token: string;
  foreground: string;
  background: string;
  threshold: ContrastThreshold;
  intended: string;
  prohibited: string;
  theme: "light" | "dark";
};

const LIGHT_PAPER = "#fafbfc";
const LIGHT_WARM = "#f3f5f7";
const DARK_PAPER = "#070d12";
const DARK_WARM = "#141c24";

/** Contract pairs asserted by tests against parsed brand-tokens.css. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { token: "--text", foreground: "--text", background: "--paper", threshold: 4.5, intended: "body", prohibited: "decorative atmosphere", theme: "light" },
  { token: "--text on card", foreground: "--text", background: "--paper-warm", threshold: 4.5, intended: "body on cards", prohibited: "decorative atmosphere", theme: "light" },
  { token: "--text-muted", foreground: "--text-muted", background: "--paper", threshold: 4.5, intended: "helper, metadata, table secondary", prohibited: "disabled; decorative stone", theme: "light" },
  { token: "--text-muted on card", foreground: "--text-muted", background: "--paper-warm", threshold: 4.5, intended: "helper on cards", prohibited: "disabled; decorative stone", theme: "light" },
  { token: "--text-link", foreground: "--text-link", background: "--paper", threshold: 4.5, intended: "inline links", prohibited: "body copy", theme: "light" },
  { token: "--text-link on card", foreground: "--text-link", background: "--paper-warm", threshold: 4.5, intended: "inline links on cards", prohibited: "body copy", theme: "light" },
  { token: "--text-on-lagoon", foreground: "--text-on-lagoon", background: "--lagoon", threshold: 4.5, intended: "primary button label", prohibited: "body on paper", theme: "light" },
  { token: "--text-on-lagoon on primary", foreground: "--text-on-lagoon", background: "--primary", threshold: 4.5, intended: "authenticated primary fill", prohibited: "white on sampled-washed lagoon", theme: "light" },
  { token: "--status-new on-fill", foreground: "--status-new-foreground", background: "--status-new", threshold: 4.5, intended: "lead status chip", prohibited: "12px white on mid blue", theme: "light" },
  { token: "--status-contacted on-fill", foreground: "--status-contacted-foreground", background: "--status-contacted", threshold: 4.5, intended: "lead status chip", prohibited: "raw --warn as 12px fill", theme: "light" },
  { token: "--status-active on-fill", foreground: "--status-active-foreground", background: "--status-active", threshold: 4.5, intended: "lead/activity status chip", prohibited: "mid green 12px fill", theme: "light" },
  { token: "--status-inactive on-fill", foreground: "--status-inactive-foreground", background: "--status-inactive", threshold: 4.5, intended: "inactive/archived chip", prohibited: "mid stone fill", theme: "light" },
  { token: "--whatsapp on-fill", foreground: "--whatsapp-foreground", background: "--whatsapp", threshold: 4.5, intended: "WhatsApp action label", prohibited: "brand #25D366", theme: "light" },
  { token: "--viber on-fill", foreground: "--viber-foreground", background: "--viber", threshold: 4.5, intended: "Viber action label", prohibited: "brand lilac fill", theme: "light" },
  { token: "--text-on-danger", foreground: "--text-on-danger", background: "--danger", threshold: 4.5, intended: "destructive button label", prohibited: "body on paper", theme: "light" },
  { token: "--text-danger", foreground: "--text-danger", background: "--paper", threshold: 4.5, intended: "error eyebrow/icon", prohibited: "long body on danger tint if pair fails", theme: "light" },
  { token: "--text-danger on surface", foreground: "--text-danger", background: "--surface-danger", threshold: 4.5, intended: "error toast eyebrow", prohibited: "long body when pair fails", theme: "light" },
  { token: "--text-warning", foreground: "--text-warning", background: "--paper", threshold: 4.5, intended: "warning eyebrow", prohibited: "body on warning tint if pair fails", theme: "light" },
  { token: "--text-warning on card", foreground: "--text-warning", background: "--paper-warm", threshold: 4.5, intended: "warning on cards", prohibited: "raw --warn as small text if pair fails", theme: "light" },
  { token: "--text-warning on surface", foreground: "--text-warning", background: "--surface-warning", threshold: 4.5, intended: "warning on tint", prohibited: "body on failing tint", theme: "light" },
  { token: "--text-success", foreground: "--text-success", background: "--paper", threshold: 4.5, intended: "success eyebrow/icon", prohibited: "raw emerald", theme: "light" },
  { token: "--text-info", foreground: "--text-info", background: "--paper", threshold: 4.5, intended: "info eyebrow", prohibited: "body on info tint if pair fails", theme: "light" },
  { token: "--text-accent", foreground: "--text-accent", background: "--paper", threshold: 4.5, intended: "gold-as-small-text, badges", prohibited: "raw --gold helper text", theme: "light" },
  { token: "--text-accent on gold-soft", foreground: "--text-accent", background: "--gold-soft", threshold: 4.5, intended: "gold badge label on gold-soft", prohibited: "raw --gold on gold-soft", theme: "light" },
  { token: "--border-control", foreground: "--border-control", background: "--paper", threshold: 3, intended: "input/select outline", prohibited: "decorative --line", theme: "light" },
  { token: "--border-control on card", foreground: "--border-control", background: "--paper-warm", threshold: 3, intended: "input outline on cards", prohibited: "decorative --line", theme: "light" },
  { token: "--ring", foreground: "--ring", background: "--paper", threshold: 3, intended: "focus indicator", prohibited: "translucent ring-ring/30", theme: "light" },
  { token: "--ring on card", foreground: "--ring", background: "--paper-warm", threshold: 3, intended: "focus indicator on cards", prohibited: "translucent ring-ring/30", theme: "light" },
  { token: "--ring (dark)", foreground: "--ring", background: "--paper", threshold: 3, intended: "dark focus indicator", prohibited: "translucent ring-ring/30", theme: "dark" },
  { token: "--ring (dark card)", foreground: "--ring", background: "--paper-warm", threshold: 3, intended: "dark focus on cards", prohibited: "translucent ring-ring/30", theme: "dark" },
  { token: "--text on surface-danger", foreground: "--text", background: "--surface-danger", threshold: 4.5, intended: "toast error body", prohibited: "danger as long body on tint", theme: "light" },
  { token: "--text on surface-success", foreground: "--text", background: "--surface-success", threshold: 4.5, intended: "toast success body", prohibited: "success as long body when pair fails", theme: "light" },
  { token: "--text-muted on surface-success", foreground: "--text-muted", background: "--surface-success", threshold: 4.5, intended: "toast dismiss on success tint", prohibited: "disabled-as-metadata", theme: "light" },
  { token: "--text (dark)", foreground: "--text", background: "--paper", threshold: 4.5, intended: "dark body", prohibited: "decorative atmosphere", theme: "dark" },
  { token: "--text-muted (dark)", foreground: "--text-muted", background: "--paper", threshold: 4.5, intended: "dark helper", prohibited: "disabled-as-metadata", theme: "dark" },
  { token: "--text-muted (dark card)", foreground: "--text-muted", background: "--paper-warm", threshold: 4.5, intended: "dark helper on cards", prohibited: "disabled-as-metadata", theme: "dark" },
  { token: "--text-link (dark)", foreground: "--text-link", background: "--paper", threshold: 4.5, intended: "dark links", prohibited: "using dark --lagoon as body link", theme: "dark" },
  { token: "--text-link (dark card)", foreground: "--text-link", background: "--paper-warm", threshold: 4.5, intended: "dark links on cards", prohibited: "using dark --lagoon as body link", theme: "dark" },
  { token: "--text-on-lagoon (dark primary)", foreground: "--text-on-lagoon", background: "--primary", threshold: 4.5, intended: "dark primary button", prohibited: "white on #12877d", theme: "dark" },
  { token: "--text-danger (dark)", foreground: "--text-danger", background: "--paper", threshold: 4.5, intended: "dark error eyebrow", prohibited: "raw red", theme: "dark" },
  { token: "--text-danger (dark surface)", foreground: "--text-danger", background: "--surface-danger", threshold: 4.5, intended: "dark error toast eyebrow", prohibited: "long body when pair fails", theme: "dark" },
  { token: "--text-warning (dark)", foreground: "--text-warning", background: "--paper", threshold: 4.5, intended: "dark warning eyebrow", prohibited: "light --warn on dark paper", theme: "dark" },
  { token: "--text-success (dark)", foreground: "--text-success", background: "--paper", threshold: 4.5, intended: "dark success eyebrow", prohibited: "raw emerald", theme: "dark" },
  { token: "--text-success (dark surface graphic)", foreground: "--text-success", background: "--surface-success", threshold: 3, intended: "success toast icon (graphic)", prohibited: "12px success label on dark tint", theme: "dark" },
  { token: "--text-accent (dark)", foreground: "--text-accent", background: "--paper", threshold: 4.5, intended: "dark gold-as-small-text", prohibited: "raw --gold helper", theme: "dark" },
  { token: "--border-control (dark)", foreground: "--border-control", background: "--paper", threshold: 3, intended: "dark input outline", prohibited: "decorative --line", theme: "dark" },
  { token: "--text on dark surface-danger", foreground: "--text", background: "--surface-danger", threshold: 4.5, intended: "dark toast error body", prohibited: "danger as long body", theme: "dark" },
  { token: "--text on dark surface-success", foreground: "--text", background: "--surface-success", threshold: 4.5, intended: "dark toast success body", prohibited: "success as long body when pair fails", theme: "dark" },
  { token: "--text-muted on dark surface-success", foreground: "--text-muted", background: "--surface-success", threshold: 4.5, intended: "dark toast dismiss", prohibited: "disabled-as-metadata", theme: "dark" },
];

export const MIGRATED_PRODUCT_FILES = [
  "components/ui/toast-provider.tsx",
  "components/ui/button.tsx",
  "components/auth/login-form.tsx",
  "components/auth/login-page-client.tsx",
  "components/auth/login-workspace-notice.tsx",
  "components/auth/auth-flow-shell.tsx",
  "components/auth/platform-login-page-client.tsx",
  "components/team/invite-accept-page-client.tsx",
  "app/invite/accept/page.tsx",
  "components/shell/plan-badge.tsx",
  "components/shell/limit-meter.tsx",
  "components/shell/sponsored-badge.tsx",
  "components/activities/activity-plan-reg-cap-indicator.tsx",
  "components/reports/report-narrative-hero.tsx",
  "components/reports/report-visual-primitives.tsx",
  "components/layouts/admin-mobile-tab-bar.tsx",
  "components/dashboard/dashboard-onboarding-checklist.tsx",
  "components/dashboard/dashboard-follow-up-queue.tsx",
  "components/dashboard/dashboard-recent-campaigns-section.tsx",
  "components/dashboard/dashboard-greeting-header.tsx",
  "components/dashboard/dashboard-empty-state.tsx",
  "components/dashboard/metric-tile.tsx",
  "components/dashboard/dashboard-metrics-table.tsx",
  "components/dashboard/dashboard-metrics-graphs.tsx",
  "components/dashboard/dashboard-activity-performance-table.tsx",
  "components/dashboard/activity-performance-row.tsx",
  "components/dashboard/dashboard-community-pulse.tsx",
  "components/dashboard/dashboard-lead-status-chart.tsx",
  "components/auth/forgot-password-form.tsx",
  "components/auth/register-form.tsx",
  "components/auth/reset-password-form.tsx",
  "components/auth/verify-email-form.tsx",
  "components/ui/filter-select.tsx",
  "components/shell/upgrade-panel.tsx",
  "components/activities/activity-capacity-panel.tsx",
  "components/activities/activity-overview-event-details.tsx",
  "components/billing/billing-invoice-history-section.tsx",
  "components/dashboard/dashboard-quick-actions.tsx",
  "components/dashboard/dashboard-today-strip.tsx",
  "components/dashboard/dashboard-intelligence-brief.tsx",
  "components/settings/brand-accent-section.tsx",
  "components/settings/custom-domain-section.tsx",
  "components/settings/settings-right-rail.tsx",
  "components/settings/settings-team-page-content.tsx",
  "components/website/website-builder-page.tsx",
  "components/website/website-publish-readiness-panel.tsx",
  "components/website/website-builder-toolbar.tsx",
  "components/website/website-publish-success-dialog.tsx",
  "components/website/website-health-strip.tsx",
  "components/website/website-setup-checklist.tsx",
  "components/settings/help-support-section.tsx",
  "components/settings/change-password-section.tsx",
  "components/reports/report-community-ranking-panel.tsx",
  "components/reports/report-trust-bar.tsx",
  "components/reports/report-activity-ranking-chart.tsx",
  "components/reports/report-lead-growth-panel.tsx",
  "components/reports/report-follow-up-chart.tsx",
  "components/dashboard/activity-calendar-popout.tsx",
  "components/clients/client-relationship-timeline.tsx",
  "components/clients/client-follow-up-date-field.tsx",
  "components/clients/client-follow-up-panel.tsx",
  "components/clients/client-profile-header.tsx",
  "components/clients/client-registration-history.tsx",
  "components/clients/client-outreach-log-card.tsx",
  "components/clients/client-lead-queue-header.tsx",
  "components/clients/messenger-open-confirm-dialog.tsx",
  "components/clients/client-row.tsx",
  "components/activities/activities-recovery-chips.tsx",
  "components/settings/settings-workspace-nav.tsx",
  "components/settings/notifications-section.tsx",
  "components/website/website-section-fields.tsx",
  "components/website/website-branding-section.tsx",
  "components/website/website-builder-onboarding-tour.tsx",
  "components/billing/checkout-page-content.tsx",
  "components/layouts/admin-command-palette.tsx",
  "components/campaigns/segment-picker.tsx",
  "components/campaigns/additional-recipients-picker.tsx",
  "components/campaigns/email-composer.tsx",
  "components/campaigns/campaign-detail-page.tsx",
  "components/campaigns/campaign-compose-page.tsx",
  "components/campaigns/email-delivery-checklist.tsx",
  "components/campaigns/campaigns-list-page.tsx",
  "components/shared/product-empty-state.tsx",
  "components/shared/person-avatar.tsx",
  "components/settings/settings-page-header.tsx",
] as const;

export const FOCUS_RING_FILES = [
  "components/ui/button.tsx",
  "components/ui/input.tsx",
  "components/ui/filter-select.tsx",
  "components/auth/login-form.tsx",
  "components/auth/register-form.tsx",
  "components/auth/forgot-password-form.tsx",
  "components/auth/reset-password-form.tsx",
  "components/auth/verify-email-form.tsx",
  "components/team/invite-accept-page-client.tsx",
  "components/settings/change-password-section.tsx",
  "components/settings/help-support-section.tsx",
  "components/settings/notifications-section.tsx",
  "components/billing/in-app-billing-panel.tsx",
  "components/website/website-branding-section.tsx",
] as const;

export const TRANSLUCENT_RING_PATTERN = /ring-ring\/(?:30|50)/;

/** Focus-visible/within rings must be opaque semantic --ring or --destructive. */
export const TRANSLUCENT_FOCUS_RING_PATTERN =
  /focus-(?:visible|within):ring-(?:ring|primary|lagoon|destructive)\/\d+/;

export const AUTHENTICATED_PRODUCT_GLOBS = [
  "components/auth",
  "components/shell",
  "components/dashboard",
  "components/clients",
  "components/activities",
  "components/reports",
  "components/settings",
  "components/website",
  "components/billing",
  "components/ui",
  "components/layouts",
  "components/team",
  "components/campaigns",
  "components/shared",
] as const;

const FORBIDDEN_IN_MIGRATED = [
  /\btext-stone\b/,
  /placeholder:text-stone/,
  /\btext-gold(?!-soft|-cinema)\b/,
  /\btext-lagoon(?!-fg)\b/,
  /\btext-primary(?!-foreground)\b/,
  /\btext-red-\d{2,3}\b/,
  /\btext-emerald-\d{2,3}\b/,
  /\btext-amber-700\b/,
  /\bbg-red-\d{2,3}\b/,
  /\bbg-emerald-\d{2,3}\b/,
  /\bborder-red-\d{2,3}\b/,
  /\bborder-emerald-\d{2,3}\b/,
];

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const normalized = raw.length === 3 ? raw.split("").map((ch) => `${ch}${ch}`).join("") : raw;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const a = relativeLuminance(foregroundHex);
  const b = relativeLuminance(backgroundHex);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgbChannels(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "");
  const normalized = raw.length === 3 ? raw.split("").map((ch) => `${ch}${ch}`).join("") : raw;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, "0");
}

/** Alpha-composite `fg` over `bg` (sRGB, 0–1 alpha). */
export function compositeOver(foregroundHex: string, backgroundHex: string, alpha: number): string {
  const fg = parseRgbChannels(foregroundHex);
  const bg = parseRgbChannels(backgroundHex);
  const r = fg.r * alpha + bg.r * (1 - alpha);
  const g = fg.g * alpha + bg.g * (1 - alpha);
  const b = fg.b * alpha + bg.b * (1 - alpha);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export type CompositeRingRow = {
  label: string;
  theme: "light" | "dark";
  alpha: number;
  ring: string;
  background: string;
  composited: string;
  ratio: number;
  threshold: ContrastThreshold;
  pass: boolean;
};

export function buildCompositeRingRows(
  light: Record<string, string>,
  dark: Record<string, string>
): CompositeRingRow[] {
  const rows: CompositeRingRow[] = [];
  for (const alpha of [0.3, 0.5, 1] as const) {
    for (const theme of ["light", "dark"] as const) {
      const vars = theme === "light" ? light : dark;
      for (const backgroundToken of ["--paper", "--paper-warm"] as const) {
        const ring = resolveColor("--ring", vars);
        const background = resolveColor(backgroundToken, vars);
        const composited = alpha === 1 ? ring : compositeOver(ring, background, alpha);
        const ratio = Math.round(contrastRatio(composited, background) * 100) / 100;
        rows.push({
          label: `ring/${Math.round(alpha * 100)} on ${backgroundToken} (${theme})`,
          theme,
          alpha,
          ring,
          background,
          composited,
          ratio,
          threshold: 3,
          pass: ratio >= 3,
        });
      }
    }
  }
  return rows;
}

function extractBlock(css: string, prelude: string): string {
  const start = css.indexOf(prelude);
  if (start < 0) {
    throw new Error(`Missing CSS block ${prelude}`);
  }
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, i);
      }
    }
  }
  throw new Error(`Unclosed CSS block ${prelude}`);
}

function parseDeclarations(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

export function parseBrandTokens(css: string): { light: Record<string, string>; dark: Record<string, string> } {
  return {
    light: parseDeclarations(extractBlock(css, ":root")),
    dark: parseDeclarations(extractBlock(css, ".dark")),
  };
}

export function parseNamedTokenBlock(css: string, prelude: string): Record<string, string> {
  return parseDeclarations(extractBlock(css, prelude));
}

export type ContrastMatrixRow = {
  token: string;
  theme: "light" | "dark";
  foregroundToken: string;
  backgroundToken: string;
  foregroundValue: string;
  backgroundValue: string;
  ratio: number;
  threshold: ContrastThreshold;
  pass: boolean;
  intended: string;
  prohibited: string;
};

export function buildContrastMatrixRows(
  light: Record<string, string>,
  dark: Record<string, string>
): ContrastMatrixRow[] {
  return CONTRAST_PAIRS.map((pair) => {
    const vars = pair.theme === "light" ? light : dark;
    const foregroundValue = resolveColor(pair.foreground, vars);
    const backgroundValue = resolveColor(pair.background, vars);
    const ratio = Math.round(contrastRatio(foregroundValue, backgroundValue) * 100) / 100;
    return {
      token: pair.token,
      theme: pair.theme,
      foregroundToken: pair.foreground,
      backgroundToken: pair.background,
      foregroundValue,
      backgroundValue,
      ratio,
      threshold: pair.threshold,
      pass: ratio >= pair.threshold,
      intended: pair.intended,
      prohibited: pair.prohibited,
    };
  });
}

export function resolveColor(
  name: string,
  theme: Record<string, string>,
  seen = new Set<string>()
): string {
  if (name.startsWith("#")) {
    return name;
  }
  if (seen.has(name)) {
    throw new Error(`Cycle resolving ${name}`);
  }
  seen.add(name);
  const value = theme[name];
  if (!value) {
    throw new Error(`Unknown token ${name}`);
  }
  const varMatch = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (varMatch) {
    return resolveColor(varMatch[1], theme, seen);
  }
  if (value.startsWith("#")) {
    return value;
  }
  throw new Error(`Cannot resolve ${name} = ${value}`);
}

export function loadBrandTokensCss(webRoot = path.resolve(__dirname, "..")): string {
  return fs.readFileSync(path.join(webRoot, "styles/brand-tokens.css"), "utf8");
}

export function assertMigratedFileHasNoForbiddenClasses(source: string, file: string): string[] {
  const hits: string[] = [];
  for (const pattern of FORBIDDEN_IN_MIGRATED) {
    if (pattern.test(source)) {
      hits.push(`${file} matches ${pattern}`);
    }
  }
  return hits;
}

export function fallbackPaper(theme: "light" | "dark"): { paper: string; warm: string } {
  return theme === "light"
    ? { paper: LIGHT_PAPER, warm: LIGHT_WARM }
    : { paper: DARK_PAPER, warm: DARK_WARM };
}
