import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const http = require("node:http");

const outDir = new URL("../public/docs-screenshots/", import.meta.url);
await mkdir(outDir, { recursive: true });

const email = process.env.E2E_OPERATOR_EMAIL ?? "operator@cohestra.local";
const password = process.env.E2E_OPERATOR_PASSWORD ?? "ChangeMe123!";
const webOrigin = process.env.DOCS_SHOT_ORIGIN ?? "http://default.localhost:3000";
const apiOrigin = process.env.DOCS_SHOT_API ?? "http://localhost:8080";

const tokens = await new Promise((resolve, reject) => {
  const body = JSON.stringify({ email, password });
  const request = http.request(
    {
      hostname: "127.0.0.1",
      port: 8080,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: "default.localhost",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`API login failed ${response.statusCode} ${raw}`));
          return;
        }
        resolve(JSON.parse(raw));
      });
    }
  );
  request.on("error", reject);
  request.write(body);
  request.end();
});
if (!tokens.accessToken || !tokens.refreshToken) {
  throw new Error(`Login response missing tokens: ${JSON.stringify(tokens)}`);
}
const session = {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresAt: Date.now() + (tokens.expiresInSeconds ?? tokens.expiresIn ?? 3600) * 1000,
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const shots = [];

async function shot(name, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(700);
  await page.screenshot({ path: new URL(name, outDir).pathname, fullPage: false });
  shots.push({ name, url: page.url(), width, height, status: "ok" });
  console.log(`captured ${name} ${page.url()}`);
}

await page.goto(`${webOrigin}/login`, { waitUntil: "domcontentloaded" });
await shot("01-login.png");

await page.addInitScript((stored) => {
  localStorage.setItem("auth_session", JSON.stringify(stored));
}, session);
await page.goto(`${webOrigin}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
if (page.url().includes("/login")) {
  throw new Error("Session inject failed; still on login");
}

const pages = [
  ["02-dashboard.png", "/dashboard"],
  ["03-activities-list.png", "/activities"],
  ["04-activity-create.png", "/activities/new"],
  ["11-clients-list.png", "/clients"],
  ["13-follow-up.png", "/follow-up"],
  ["16-analytics.png", "/analytics"],
  ["17-cohestra-ai.png", "/ai"],
  ["18-settings.png", "/settings"],
];

for (const [name, path] of pages) {
  await page.goto(`${webOrigin}${path}`, { waitUntil: "domcontentloaded" });
  await shot(name);
}

await page.goto(`${webOrigin}/dashboard/website`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const skipTour = page.getByRole("button", { name: /skip tour/i });
if (await skipTour.count()) {
  await skipTour.first().click();
  await page.waitForTimeout(500);
}
await shot("14-website-studio.png");

await page.goto(`${webOrigin}/campaigns/new`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await shot("15-campaigns.png");

const marinaId = process.env.DOCS_SHOT_ACTIVITY_ID ?? "6df31f12-977b-4af3-8289-c17b115d127b";
await page.goto(`${webOrigin}/activities/${marinaId}?tab=form`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
if (!page.url().includes("/activities/")) {
  throw new Error(`Activity form did not load: ${page.url()}`);
}
  const composition = page.getByRole("link", { name: "Go to composition" });
  if (await composition.count()) {
    await composition.first().click();
    await page.waitForTimeout(400);
  }
  await shot("05-form-studio-build.png");
  const previewTab = page.getByRole("tab", { name: "Preview", exact: true });
  if (await previewTab.count()) {
    await previewTab.first().click();
    await page.waitForTimeout(800);
    await shot("07-form-studio-preview.png");
  }
  const designTab = page.getByRole("tab", { name: "Design", exact: true }).or(
    page.getByRole("button", { name: "Design", exact: true })
  );
  if (await designTab.count()) {
    await designTab.first().click();
    await page.waitForTimeout(600);
    await shot("06-activity-design.png");
  }
  const shareTab = page.getByRole("tab", { name: "Share kit", exact: true }).or(
    page.getByRole("button", { name: "Share kit", exact: true })
  );
  if (await shareTab.count()) {
    await shareTab.first().click();
    await page.waitForTimeout(600);
    await shot("08-share-kit.png");
  }

await page.goto(`${webOrigin}/clients`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const profile = page.locator('a[href*="/clients/"]').first();
if (await profile.count()) {
  await profile.click();
  await page.waitForTimeout(800);
  await shot("12-client-profile.png");
}

const registerLink = page.locator('a[href*="/register/"]').first();
if (await registerLink.count()) {
  const href = await registerLink.getAttribute("href");
  if (href) {
    await page.goto(href.startsWith("http") ? href : `${webOrigin}${href}`, {
      waitUntil: "domcontentloaded",
    });
    await shot("09-public-registration-desktop.png", 1440, 900);
    await shot("10-public-registration-mobile.png", 390, 844);
  }
} else {
  await page.goto(`${webOrigin}/activities`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const anyActivity = page.locator('a[href*="/activities/"]').first();
  if (await anyActivity.count()) {
    await anyActivity.click();
    await page.waitForTimeout(600);
    const share = page.getByText("Share kit", { exact: true }).first();
    if (await share.count()) {
      await share.click();
      await page.waitForTimeout(500);
    }
    const publicUrl = await page.locator("input[readonly], input[value*='register']").first().inputValue().catch(() => "");
    if (publicUrl.includes("register")) {
      await page.goto(publicUrl, { waitUntil: "domcontentloaded" });
      await shot("09-public-registration-desktop.png", 1440, 900);
      await shot("10-public-registration-mobile.png", 390, 844);
    }
  }
}

await browser.close();
console.log(JSON.stringify(shots, null, 2));
if (shots.length < 15) {
  process.exitCode = 1;
}
