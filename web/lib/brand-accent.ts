import type { CSSProperties } from "react";

/** Curated accent presets — presets first, custom hex second. */
export const brandAccentPresets = [
  { id: "terracotta", label: "Terracotta", hex: "#c45c26" },
  { id: "forest", label: "Forest", hex: "#2d6a4f" },
  { id: "ocean", label: "Ocean", hex: "#2563eb" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "indigo", label: "Indigo", hex: "#4f46e5" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "rose", label: "Rose", hex: "#e11d48" },
  { id: "amber", label: "Amber", hex: "#d97706" },
  { id: "slate", label: "Slate", hex: "#475569" },
] as const;

/** Default homepage accent from seed settings. */
export const defaultSiteAccentColor = brandAccentPresets[0].hex;

export type BrandAccentPresetId = (typeof brandAccentPresets)[number]["id"];

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeBrandAccentColor(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

export function isValidBrandAccentColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeBrandAccentColor(hex) ?? hex;
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixRgb(base: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: base.r + (target.r - base.r) * amount,
    g: base.g + (target.g - base.g) * amount,
    b: base.b + (target.b - base.b) * amount,
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function foregroundForBackground(hex: string): string {
  return relativeLuminance(hexToRgb(hex)) > 0.55 ? "#081c15" : "#ffffff";
}

function deriveAccentTier(baseHex: string, isDark: boolean) {
  const base = hexToRgb(baseHex);
  const white: Rgb = { r: 255, g: 255, b: 255 };

  const primary = isDark
    ? rgbToHex(mixRgb(base, white, 0.28))
    : baseHex.toLowerCase();
  const accent = isDark
    ? rgbToHex(mixRgb(hexToRgb(primary), white, 0.12))
    : rgbToHex(mixRgb(base, white, 0.14));
  const ring = isDark ? accent : rgbToHex(mixRgb(base, white, 0.1));

  return {
    primary,
    primaryForeground: foregroundForBackground(primary),
    accent,
    accentForeground: foregroundForBackground(accent),
    ring,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: foregroundForBackground(primary),
    sidebarRing: ring,
    chart1: primary,
  };
}

export type BrandAccentCssVars = CSSProperties;

/** Maps one accent hex to the accent-tier CSS variables only (semantic tokens unchanged). */
export function buildBrandAccentStyle(
  accentHex: string | null | undefined,
  isDark: boolean
): BrandAccentCssVars | undefined {
  const normalized = normalizeBrandAccentColor(accentHex);
  if (!normalized || !isValidBrandAccentColor(normalized)) {
    return undefined;
  }

  const tier = deriveAccentTier(normalized, isDark);

  return {
    "--primary": tier.primary,
    "--primary-foreground": tier.primaryForeground,
    "--accent": tier.accent,
    "--accent-foreground": tier.accentForeground,
    "--ring": tier.ring,
    "--sidebar-primary": tier.sidebarPrimary,
    "--sidebar-primary-foreground": tier.sidebarPrimaryForeground,
    "--sidebar-ring": tier.sidebarRing,
    "--chart-1": tier.chart1,
  } as BrandAccentCssVars;
}

export function presetIdForColor(
  accentColor: string | null | undefined
): BrandAccentPresetId | "custom" | null {
  const normalized = normalizeBrandAccentColor(accentColor);
  if (!normalized) {
    return null;
  }

  const preset = brandAccentPresets.find((item) => item.hex === normalized);
  return preset?.id ?? "custom";
}
