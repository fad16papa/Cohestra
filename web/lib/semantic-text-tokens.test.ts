import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONTRAST_PAIRS,
  MIGRATED_PRODUCT_FILES,
  assertMigratedFileHasNoForbiddenClasses,
  contrastRatio,
  loadBrandTokensCss,
  parseBrandTokens,
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
