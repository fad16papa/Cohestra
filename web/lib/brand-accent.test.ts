import { describe, expect, it } from "vitest";

import { brandAccentPresets, buildBrandAccentStyle } from "@/lib/brand-accent";

function parseRgb(value: string): { r: number; g: number; b: number } {
  const hex = value.replace("#", "");
  const n = Number.parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrast(a: string, b: string): number {
  const left = parseRgb(a);
  const right = parseRgb(b);
  const l1 =
    0.2126 * linearize(left.r) + 0.7152 * linearize(left.g) + 0.0722 * linearize(left.b);
  const l2 =
    0.2126 * linearize(right.r) + 0.7152 * linearize(right.g) + 0.0722 * linearize(right.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("brand accent overlay contrast", () => {
  it.each([...brandAccentPresets.map((preset) => preset.hex), "#c45c26", "#0d9488"])(
    "keeps %s primary fill ≥4.5:1 with its foreground on the light surface",
    (hex) => {
      const style = buildBrandAccentStyle(hex);
      expect(style).toBeDefined();
      const vars = style as Record<string, string>;
      const primary = String(vars["--primary"]);
      const foreground = String(vars["--primary-foreground"]);
      const ring = String(vars["--ring"]);
      expect(contrast(foreground, primary), hex).toBeGreaterThanOrEqual(8);
      expect(ring).toBe(primary);
    }
  );
});
