import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/marketing-home-page.tsx"),
  "utf8"
);
const shell = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/marketing-shell.tsx"),
  "utf8"
);

describe("landing Cinema section removal", () => {
  it("does not mount the house-tour carousel on marketing home", () => {
    expect(home).not.toContain("MarketingProductCarousel");
    expect(home).not.toContain("Walk the club before you sign up");
    expect(home).not.toContain("#crm");
    expect(home).toContain("id=\"features\"");
    expect(home).toContain("id=\"how-it-works\"");
    expect(home).toContain("id=\"pricing\"");
  });

  it("removes exclusive Cinema hash navigation", () => {
    expect(shell).not.toContain("/#crm");
    expect(shell).not.toContain("#crm");
    expect(shell).toContain("/#features");
    expect(shell).toContain("/#how-it-works");
  });
});
