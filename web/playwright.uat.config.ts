import { defineConfig } from "@playwright/test";

const baseURL = process.env.UAT_PUBLIC_BASE_URL ?? "";

if (!baseURL) {
  throw new Error("UAT_PUBLIC_BASE_URL is required for the UAT Playwright project");
}

if (!baseURL.startsWith("https://")) {
  throw new Error("UAT Playwright requires https:// UAT_PUBLIC_BASE_URL");
}

if (baseURL.includes("thesocialcollectivesg.com") || baseURL.includes("129.212.235.2")) {
  throw new Error("UAT Playwright must not target the shared CRM host");
}

export default defineConfig({
  testDir: "./e2e-uat",
  testMatch: /.*\.spec\.ts/,
  testIgnore: ["**/lifecycle/**"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/uat-playwright.json" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "uat-desktop-1440",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "uat-mobile-390",
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
});
