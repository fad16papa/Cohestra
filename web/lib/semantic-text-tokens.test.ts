import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  AUTHENTICATED_PRODUCT_GLOBS,
  CONTRAST_PAIRS,
  MIGRATED_PRODUCT_FILES,
  FOCUS_RING_FILES,
  TRANSLUCENT_RING_PATTERN,
  TRANSLUCENT_FOCUS_RING_PATTERN,
  assertMigratedFileHasNoForbiddenClasses,
  buildCompositeRingRows,
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
    expect(dark).toEqual({});
    expect(light["--text-disabled"]).toBe("var(--stone)");
  });

  it("keeps cinema stone as a local token, not the global muted token", () => {
    expect(light["--stone-cinema"]).toBe("#5a636e");
    expect(light["--text-muted"]).toBe("#252c33");
    expect(light["--text-muted"]).not.toBe("var(--stone-cinema)");
    const globals = fs.readFileSync(path.join(webRoot, "app/globals.css"), "utf8");
    expect(globals).toMatch(/\[data-demo-theme\]/);
    expect(globals).toMatch(/--text-muted:\s*var\(--stone-cinema\)/);
  });

  it("maps input borders to the control token", () => {
    expect(light["--input"]).toBe("var(--border-control)");
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

  it("does not ship a reachable dark application token skin", () => {
    expect(css).not.toMatch(/^\.dark\s*\{/m);
    expect(dark).toEqual({});
    expect(CONTRAST_PAIRS.every((pair) => pair.theme === "light")).toBe(true);
    expect(resolveColor("--text-warning", light)).toBe("#8a5c00");
  });

  it("does not use dark primary overlays or accent gradients for selected/on-accent text", () => {
    const filter = fs.readFileSync(path.join(webRoot, "components/ui/filter-select.tsx"), "utf8");
    expect(filter).not.toMatch(/dark:bg-primary\//);
    expect(filter).not.toMatch(/from-primary to-accent/);
    expect(filter).toMatch(/bg-primary text-primary-foreground/);
    expect(filter).toMatch(/dark:bg-primary/);
    expect(filter).not.toMatch(/dark:bg-primary\//);

    for (const file of [
      "components/auth/register-form.tsx",
      "components/auth/reset-password-form.tsx",
      "components/auth/verify-email-form.tsx",
    ]) {
      const source = fs.readFileSync(path.join(webRoot, file), "utf8");
      expect(source, file).not.toMatch(/from-primary to-accent/);
    }
  });

  it("locks registration preview to light lagoon rather than inheriting dark lagoon", () => {
    const preview = parseNamedTokenBlock(css, ".registration-preview-surface");
    expect(preview["--lagoon"]).toBe("#0b6b63");
    expect(preview["--primary"]).toBe("#043532");
    expect(preview["--text-link"]).toBe("#043532");
    expect(preview["--text-warning"]).toBe("#8a5c00");
  });

  it("matches the machine-readable contrast matrix", () => {
    const matrixPath = path.resolve(
      webRoot,
      "../_bmad-output/planning-artifacts/evidence/px2-38-4/contrast-matrix.json"
    );
    const expected = buildContrastMatrixRows(light, dark);
    expect(expected.every((row) => row.pass)).toBe(true);
    fs.mkdirSync(path.dirname(matrixPath), { recursive: true });
    fs.writeFileSync(
      matrixPath,
      `${JSON.stringify(
        {
          generated: new Date().toISOString().slice(0, 10),
          wcag: "2.2",
          rows: expected,
        },
        null,
        2
      )}\n`
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
    expect(matrix.rows).toHaveLength(expected.length);

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

describe("focus-ring composite contract", () => {
  const css = loadBrandTokensCss(webRoot);
  const { light, dark } = parseBrandTokens(css);
  const rows = buildCompositeRingRows(light, dark);
  const evidenceDir = path.resolve(
    webRoot,
    "../_bmad-output/planning-artifacts/evidence/px2-38-4"
  );

  it("publishes the composite focus-ring table", () => {
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, "focus-ring-composite.json"),
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          requirement: "Visible focus indicator ≥3:1 against adjacent after alpha compositing",
          rows,
        },
        null,
        2
      )
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("rejects composited ring-ring/30 and ring-ring/50 against paper and cards", () => {
    const translucent = rows.filter((row) => row.alpha < 1);
    expect(translucent.length).toBeGreaterThan(0);
    for (const row of translucent) {
      expect(row.pass, row.label).toBe(false);
    }
  });

  it("accepts opaque --ring against paper and cards on the light surface", () => {
    const opaque = rows.filter((row) => row.alpha === 1);
    expect(opaque).toHaveLength(2);
    for (const row of opaque) {
      expect(row.pass, `${row.label} ${row.composited} on ${row.background} ${row.ratio}`).toBe(
        true
      );
    }
  });

  it("does not keep translucent ring-ring/30 or /50 on contracted focus surfaces", () => {
    const hits = FOCUS_RING_FILES.flatMap((file) => {
      const source = fs.readFileSync(path.join(webRoot, file), "utf8");
      return TRANSLUCENT_RING_PATTERN.test(source) ? [`${file} has translucent ring-ring`] : [];
    });
    expect(hits).toEqual([]);
  });

  it("does not keep translucent focus rings on contracted focus surfaces", () => {
    const hits = FOCUS_RING_FILES.flatMap((file) => {
      const source = fs.readFileSync(path.join(webRoot, file), "utf8");
      return TRANSLUCENT_FOCUS_RING_PATTERN.test(source)
        ? [`${file} has translucent focus ring`]
        : [];
    });
    expect(hits).toEqual([]);
  });

  it("does not keep translucent ring-ring/30 or /50 in authenticated product UI", () => {
    const hits = AUTHENTICATED_PRODUCT_GLOBS.flatMap((glob) => {
      const dir = path.join(webRoot, glob);
      if (!fs.existsSync(dir)) {
        return [];
      }
      const files: string[] = [];
      const walk = (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
            files.push(full);
          }
        }
      };
      walk(dir);
      return files.flatMap((file) => {
        const source = fs.readFileSync(file, "utf8");
        return TRANSLUCENT_RING_PATTERN.test(source)
          ? [path.relative(webRoot, file)]
          : [];
      });
    });
    expect(hits).toEqual([]);
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
