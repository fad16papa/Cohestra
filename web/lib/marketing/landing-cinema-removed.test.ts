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
const hero = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/marketing-hero-product-stack.tsx"),
  "utf8"
);
const content = readFileSync(resolve(import.meta.dirname, "./landing-content.ts"), "utf8");

describe("landing Cinema section removal", () => {
  it("does not mount the house-tour carousel on marketing home", () => {
    expect(home).not.toContain("MarketingProductCarousel");
    expect(home).not.toContain("Walk the club before you sign up");
    expect(home).not.toContain("#crm");
    expect(home).toContain("id=\"features\"");
    expect(home).toContain("id=\"how-it-works\"");
    expect(home).toContain("id=\"pricing\"");
    expect(home).toContain("Registration, clients, and follow-up in one workspace");
    expect(home).not.toContain("Under 1 hr");
    expect(home).not.toContain("hero-community-sports");
  });

  it("shows a product preview and verified plan gates, not a sports photo or fake metrics", () => {
    expect(hero).toContain("Product preview");
    expect(hero).toContain("Follow-up");
    expect(hero).toContain("Website");
    expect(hero).toContain("Campaigns");
    expect(hero).toContain("Core");
    expect(hero).toContain("Pro");
    expect(hero).not.toContain("hero-community-sports");
    expect(hero).not.toContain("Elena");
    expect(hero).not.toContain("Sunday clinic");

    for (const room of [
      "Activities",
      "Registration",
      "Clients",
      "Follow-up",
      "Form Studio",
      "Website Studio",
      "Analytics",
      "Campaigns",
      "Cohestra AI",
    ]) {
      expect(content).toContain(room);
    }

    expect(content).toContain("Basic saves 1 form recipe");
    expect(content).toContain("Campaigns require Pro");
    expect(content).toContain("Website Studio requires Core");
    expect(content).not.toMatch(/under an hour/i);
    expect(content).not.toMatch(/testimonial/i);
  });

  it("removes exclusive Cinema hash navigation", () => {
    expect(shell).not.toContain("/#crm");
    expect(shell).not.toContain("#crm");
    expect(shell).toContain("/#features");
    expect(shell).toContain("/#how-it-works");
  });
});
