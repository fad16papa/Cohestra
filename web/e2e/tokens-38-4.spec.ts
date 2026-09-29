import { expect, test } from "@playwright/test";

function luminance(rgb: string): number {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    throw new Error(`Cannot parse color ${rgb}`);
  }
  const channels = match.slice(1, 4).map((value) => {
    const c = Number(value) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

test("semantic muted text is ≥4.5:1 on paper and is not stone", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const measured = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.setAttribute("data-token-probe", "muted");
    probe.style.color = "var(--text-muted)";
    probe.style.backgroundColor = "var(--paper)";
    probe.textContent = "Muted helper";
    document.body.append(probe);
    const styles = getComputedStyle(probe);
    const root = getComputedStyle(document.documentElement);
    const result = {
      color: styles.color,
      background: styles.backgroundColor,
      muted: root.getPropertyValue("--text-muted").trim(),
      stone: root.getPropertyValue("--stone").trim(),
      cinema: root.getPropertyValue("--stone-cinema").trim(),
      mutedForeground: root.getPropertyValue("--muted-foreground").trim(),
    };
    probe.remove();
    return result;
  });

  expect(measured.muted).toBe("#5a636e");
  expect(measured.stone).toBe("#8b939c");
  expect(measured.cinema).toBe("#5a636e");
  expect(measured.mutedForeground.length).toBeGreaterThan(0);
  expect(contrast(measured.color, measured.background)).toBeGreaterThanOrEqual(4.5);
});
