import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONTRAST_PAIRS,
  MIGRATED_PRODUCT_FILES,
  assertMigratedFileHasNoForbiddenClasses,
  buildContrastMatrixRows,
  contrastRatio,
  loadBrandTokensCss,
  parseBrandTokens,
  parseNamedTokenBlock,
  resolveColor,
} from "@/lib/semantic-text-tokens";

const webRoot = path.resolve(__dirname, "..");

describe("semantic text tokens", () => {
  const css = loadBrandTokensCss(webRoot);
  const { light, dark } = parseBrandTokens(css);

  it("does not alias muted helpers to stone or stone-cinema by name", () => {
    expect(light["--muted-foreground"]).toBe("var(--text-muted)");
    expect(light["--text-muted-warm"]).toBe("var(--text-muted)");
    expect(light["--text-muted"]).not.toBe("var(--stone)");
    expect(light["--text-muted"]).not.toBe("var(--stone-cinema)");
    expect(dark["--muted-foreground"]).toBe("var(--text-muted)");
    expect(dark["--text-muted-warm"]).toBe("var(--text-muted)");
    expect(light["--text-disabled"]).toBe("var(--stone)");
  });

  it("keeps cinema stone as a local token, not the global muted token", () => {
    expect(light["--stone-cinema"]).toBe("#5a636e");
    expect(light["--text-muted"]).toBe("#5a636e");
    expect(light["--text-muted"]).not.toBe("var(--stone-cinema)");
    const globals = fs.readFileSync(path.join(webRoot, "app/globals.css"), "utf8");
    expect(globals).toMatch(/\[data-demo-theme\]/);
    expect(globals).toMatch(/--text-muted:\s*var\(--stone-cinema\)/);
  });

  it("maps input borders to the control token", () => {
    expect(light["--input"]).toBe("var(--border-control)");
    expect(dark["--input"]).toBe("var(--border-control)");
  });

  it.each(CONTRAST_PAIRS)(
    "$token ($theme) meets $threshold:1",
    ({ foreground, background, threshold, theme }) => {
      const vars = theme === "light" ? light : dark;
      const fg = resolveColor(foreground, vars);
      const bg = resolveColor(background, vars);
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(threshold);
    }
  );

  it("does not use stone or gold as the muted text hex", () => {
    expect(resolveColor("--text-muted", light)).not.toBe(resolveColor("--stone", light));
    expect(resolveColor("--text-accent", light)).not.toBe(resolveColor("--gold", light));
  });

  it("keeps dark primary fill distinct from decorative dark lagoon", () => {
    expect(resolveColor("--primary", dark)).toBe("#0f7369");
    expect(resolveColor("--lagoon", dark)).toBe("#12877d");
    expect(resolveColor("--text-link", dark)).toBe("#159a90");
    expect(resolveColor("--text-warning", light)).toBe("#8a5c00");
  });

  it("locks registration preview to light lagoon rather than inheriting dark lagoon", () => {
    const preview = parseNamedTokenBlock(css, ".registration-preview-surface");
    expect(preview["--lagoon"]).toBe("#0b6b63");
    expect(preview["--primary"]).toBe("var(--lagoon)");
    expect(preview["--text-link"]).toBe("var(--lagoon)");
    expect(preview["--text-warning"]).toBe("#8a5c00");
  });

  it("matches the machine-readable contrast matrix", () => {
    const matrixPath = path.resolve(
      webRoot,
      "../_bmad-output/planning-artifacts/evidence/px2-38-4/contrast-matrix.json"
    );
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      rows: Array<{
        token: string;
        theme: string;
        foregroundToken: string;
        backgroundToken: string;
        foregroundValue: string;
        backgroundValue: string;
        ratio: number;
        threshold: number;
        pass: boolean;
      }>;
    };
    const expected = buildContrastMatrixRows(light, dark);
    expect(matrix.rows).toHaveLength(expected.length);
    expect(expected.every((row) => row.pass)).toBe(true);

    for (const row of expected) {
      const published = matrix.rows.find(
        (candidate) =>
          candidate.token === row.token &&
          candidate.theme === row.theme &&
          candidate.foregroundToken === row.foregroundToken &&
          candidate.backgroundToken === row.backgroundToken
      );
      expect(published, row.token).toBeDefined();
      expect(published?.foregroundValue.toLowerCase()).toBe(row.foregroundValue.toLowerCase());
      expect(published?.backgroundValue.toLowerCase()).toBe(row.backgroundValue.toLowerCase());
      expect(published?.threshold).toBe(row.threshold);
      expect(published?.pass).toBe(true);
      expect(published?.ratio).toBeCloseTo(row.ratio, 1);
    }
  });
});

describe("migrated authenticated product files", () => {
  it("do not reintroduce stone/red/emerald palette text classes", () => {
    const hits = MIGRATED_PRODUCT_FILES.flatMap((file) => {
      const source = fs.readFileSync(path.join(webRoot, file), "utf8");
      return assertMigratedFileHasNoForbiddenClasses(source, file);
    });
    expect(hits).toEqual([]);
  });
});
