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
const capabilityChapters = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/marketing-capability-chapters.tsx"),
  "utf8"
);
const content = readFileSync(resolve(import.meta.dirname, "./landing-content.ts"), "utf8");

describe("landing Cinema section removal", () => {
  it("does not mount the house-tour carousel on marketing home", () => {
    expect(home).not.toContain("MarketingProductCarousel");
    expect(home).not.toContain("Walk the club before you sign up");
    expect(home).not.toContain("#crm");
    expect(home).toContain("MarketingCapabilityChapters");
    expect(capabilityChapters).toContain("id=\"capabilities\"");
    expect(capabilityChapters).toContain("Sample state, not a customer result.");
    expect(capabilityChapters).toContain("Published");
    expect(capabilityChapters).toContain("History across activities");
    expect(capabilityChapters).toContain("No outreach yet");
    expect(capabilityChapters).toContain("Website Studio");
    expect(capabilityChapters).toContain("Form Studio");
    expect(capabilityChapters).toContain("Registration report");
    expect(capabilityChapters).toContain("motion-reduce:transition-none");
    expect(capabilityChapters).not.toContain("opacity-0");
    expect(home).toContain("id=\"pricing\"");
    expect(home).toContain("id=\"faq\"");
    expect(home).toContain("Know who registered, and who still needs a reply");
    expect(home).toContain("Public registration, client profiles, follow-up, and analytics");
    expect(home).toContain("LANDING_CAPABILITY_CHAPTERS");
    expect(home).not.toContain("id=\"how-it-works\"");
    expect(home).not.toContain("LANDING_OUTCOMES");
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
    expect(hero).toContain("No outreach yet");
    expect(hero).toContain("Next conversation not scheduled");
    expect(hero).toContain("No recorded outreach");
    expect(hero).toContain("FOLLOW_UP_CATEGORY_OPTIONS");
    expect(hero).not.toContain(">Open<");

    expect(content).toContain("LANDING_CAPABILITY_CHAPTERS");
    for (const room of [
      "Registration",
      "Clients",
      "Follow-up",
      "Form Studio",
      "Website Studio",
      "Analytics",
    ]) {
      expect(content).toContain(room);
    }
    for (const room of ["Campaigns", "Cohestra AI", "Activities"]) {
      expect(content).toContain(room);
    }

    expect(content).toContain("Basic saves 1 form");
    expect(content).toContain("Campaigns require Pro");
    expect(content).toContain("Website Studio requires Core");
    expect(content).not.toMatch(/under an hour/i);
    expect(content).not.toMatch(/testimonial/i);
  });

  it("removes exclusive Cinema hash navigation", () => {
    expect(shell).not.toContain("/#crm");
    expect(shell).not.toContain("#crm");
    expect(shell).toContain("/#capabilities");
    expect(shell).toContain('href="/signup"');
    expect(shell).toContain("Start free");
    expect(shell).not.toContain("/#how-it-works");
  });
});
