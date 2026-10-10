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
const only = new Set(
  (process.env.DOCS_SHOT_ONLY ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
);

function apiJson(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      Host: "default.localhost",
      Accept: "application/json",
    };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: 8080,
        path,
        method,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`${method} ${path} failed ${response.statusCode} ${raw}`));
            return;
          }
          resolve(raw ? JSON.parse(raw) : {});
        });
      }
    );
    request.on("error", reject);
    if (payload) {
      request.write(payload);
    }
    request.end();
  });
}

const tokens = await apiJson("POST", "/api/v1/auth/login", {
  body: { email, password },
});
if (!tokens.accessToken || !tokens.refreshToken) {
  throw new Error(`Login response missing tokens: ${JSON.stringify(tokens)}`);
}

const activitiesPayload = await apiJson("GET", "/api/v1/admin/activities", {
  token: tokens.accessToken,
});
const activities = activitiesPayload.items ?? activitiesPayload.Items ?? [];
const marina =
  activities.find((item) => /marina pickleball/i.test(item.name ?? item.Name ?? "")) ??
  activities.find((item) => (item.status ?? item.Status) === "published");
if (!marina) {
  throw new Error("No published demo activity available for Form Studio shots");
}
const activityId = marina.id ?? marina.Id;
const activitySlug = marina.slug ?? marina.Slug;
if (!activityId || !activitySlug) {
  throw new Error(`Activity fixture incomplete: ${JSON.stringify(marina)}`);
}

const clientsPayload = await apiJson("GET", "/api/v1/admin/clients?pageSize=20", {
  token: tokens.accessToken,
});
const clients = clientsPayload.items ?? clientsPayload.Items ?? [];
const sophia =
  clients.find((item) => /sophia/i.test(item.displayName ?? item.DisplayName ?? item.name ?? "")) ??
  clients[0];
if (!sophia) {
  throw new Error("No demo client available for profile shot");
}
const clientId = sophia.id ?? sophia.Id;

const session = {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresAt: Date.now() + (tokens.expiresInSeconds ?? tokens.expiresIn ?? 3600) * 1000,
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const shots = [];

function shouldCapture(name) {
  return only.size === 0 || only.has(name.replace(/\.png$/, ""));
}

async function requireVisible(locator, label) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    throw new Error(`Required UI missing: ${label} at ${page.url()}`);
  }
}

async function shot(name, width = 1440, height = 900) {
  if (!shouldCapture(name.replace(/\.png$/, ""))) {
    return;
  }
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(250);
  await page.screenshot({ path: new URL(name, outDir).pathname, fullPage: false });
  shots.push({ name, url: page.url(), width, height, status: "ok" });
  console.log(`captured ${name} ${page.url()}`);
}

async function openAuthed(path, label, locator) {
  await page.goto(`${webOrigin}${path}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    throw new Error(`Session lost opening ${path}`);
  }
  await requireVisible(locator, label);
}

await page.goto(`${webOrigin}/login`, { waitUntil: "domcontentloaded" });
await requireVisible(page.getByRole("heading", { name: /sign in/i }), "Sign in heading");
await shot("01-login.png");

await page.addInitScript((stored) => {
  localStorage.setItem("auth_session", JSON.stringify(stored));
  localStorage.setItem("activity-lead:website-builder-tour-completed:default", "1");
  localStorage.setItem("activity-lead:website-builder-visited:default", "1");
}, session);

await openAuthed("/dashboard", "Dashboard heading", page.getByRole("heading", { name: "Dashboard", exact: true }));
await shot("02-dashboard.png");

await openAuthed("/activities", "New activity", page.getByRole("link", { name: /new activity/i }).or(page.getByRole("button", { name: /new activity/i })));
await shot("03-activities-list.png");

await openAuthed("/activities/new", "Activity details", page.getByRole("heading", { name: /activity details|new activity/i }));
await shot("04-activity-create.png");

await openAuthed("/clients", "Clients heading", page.getByRole("heading", { name: "Clients", exact: true }));
await shot("11-clients-list.png");

await openAuthed("/follow-up", "Follow-up heading", page.getByRole("heading", { name: "Follow-up", exact: true }));
await requireVisible(page.getByRole("tab", { name: /due now/i }).or(page.getByText("Due now", { exact: true })), "Due now");
await shot("13-follow-up.png");

await openAuthed("/analytics", "Analytics heading", page.getByRole("heading", { name: "Analytics", exact: true }));
await shot("16-analytics.png");

await openAuthed("/ai", "Cohestra AI heading", page.getByRole("heading", { name: /cohestra ai/i }));
await shot("17-cohestra-ai.png");

await openAuthed("/settings", "Settings", page.getByRole("heading", { level: 1 }));
await shot("18-settings.png");

await openAuthed("/dashboard/website", "Website Studio", page.getByRole("heading", { name: /website studio/i }));
const skipTour = page.getByRole("button", { name: /skip tour/i });
if (await skipTour.count()) {
  await skipTour.first().click();
}
const tourCard = page.getByRole("heading", { name: /start with a template|choose a layout/i });
if (await tourCard.count()) {
  if (await skipTour.count()) {
    await skipTour.first().click();
  }
  await tourCard.first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {
    throw new Error("Website Studio tour still visible after Skip tour");
  });
}
const sectionsTab = page.getByRole("tab", { name: "Sections", exact: true });
await requireVisible(sectionsTab, "Sections tab");
await sectionsTab.click();
const splitTab = page.getByRole("tab", { name: "Split", exact: true });
if (await splitTab.count()) {
  await splitTab.click();
}
if (await page.getByRole("heading", { name: /start with a template/i }).count()) {
  throw new Error("Website Studio tour overlay is obstructing the builder");
}
await requireVisible(page.getByRole("tab", { name: "Sections", exact: true }), "Sections still selected");
await shot("14-website-studio.png");

await openAuthed("/campaigns/new", "Compose campaign", page.getByRole("heading", { name: /compose campaign/i }));
const community = page.getByLabel(/target community/i);
await requireVisible(community, "Target community");
await community.selectOption({ index: 1 }).catch(async () => {
  await community.click();
  const option = page.getByRole("option").nth(1);
  await requireVisible(option, "Community option");
  await option.click();
});
await requireVisible(page.getByLabel(/^subject$/i), "Campaign subject");
await requireVisible(page.getByText(/^message$/i), "Campaign message");
await page.locator("#campaign-subject").evaluate((node) => {
  node.scrollIntoView({ block: "center", inline: "nearest" });
});
await shot("15-campaigns.png");

await openAuthed(
  `/activities/${activityId}?tab=form`,
  "Form tab activity",
  page.getByRole("heading", { name: /marina pickleball|member social/i })
);
await requireVisible(page.getByRole("tab", { name: "Build form", exact: true }), "Build form tab");
await requireVisible(page.getByRole("button", { name: /save form/i }), "Save form");
await shot("05-form-studio-build.png");

const composition = page.getByRole("link", { name: "Go to composition" });
await requireVisible(composition, "Go to composition");
await composition.click();
await requireVisible(page.getByText(/block palette|form structure/i), "Form composition canvas");
await shot("05b-form-studio-composition.png");

await page.goto(`${webOrigin}/activities/${activityId}?tab=form`, {
  waitUntil: "domcontentloaded",
});
const previewTab = page.locator("#form-studio-tab-preview");
await requireVisible(previewTab, "Form Studio Preview tab");
await previewTab.click();
const previewPanel = page.locator("#form-studio-preview-panel");
await requireVisible(previewPanel.getByRole("region", { name: "Registration preview" }), "Registration preview region");
await requireVisible(previewPanel.getByText("Preview mode", { exact: true }), "Preview mode");
await previewPanel.locator("[data-registration-layout-container=preview]").evaluate((root) => {
  const scroller = root.querySelector("[class*='overflow-y-auto']") || root;
  scroller.scrollTop = 220;
});
await shot("07-form-studio-preview.png");

const designTab = page.getByRole("tab", { name: "Design", exact: true }).or(
  page.getByRole("button", { name: "Design", exact: true })
);
await requireVisible(designTab, "Design tab");
await designTab.first().click();
await requireVisible(page.getByText(/registration design|experience|modern centered/i), "Design controls");
await shot("06-activity-design.png");

const shareTab = page.getByRole("tab", { name: "Share kit", exact: true }).or(
  page.getByRole("button", { name: "Share kit", exact: true })
);
await requireVisible(shareTab, "Share kit tab");
await shareTab.first().click();
await requireVisible(page.getByText(/qr code|registration link/i), "Share kit link or QR");
await shot("08-share-kit.png");

await openAuthed(`/clients/${clientId}`, "Client profile", page.getByRole("heading", { level: 1 }));
await shot("12-client-profile.png");

await page.goto(`${webOrigin}/register/${activitySlug}`, { waitUntil: "domcontentloaded" });
await requireVisible(page.getByRole("heading", { name: /marina pickleball/i }), "Public registration heading");
await requireVisible(page.getByLabel(/full name/i), "Public Full name");
await shot("09-public-registration-desktop.png", 1440, 900);
await page.setViewportSize({ width: 390, height: 844 });
const join = page.getByRole("button", { name: /join activity/i });
await requireVisible(join, "Join activity");
await join.evaluate((node) => node.scrollIntoView({ block: "end", inline: "nearest" }));
await shot("10-public-registration-mobile.png", 390, 844);

await browser.close();
console.log(JSON.stringify({ activityId, activitySlug, clientId, shots }, null, 2));
if (only.size === 0 && shots.length < 19) {
  throw new Error(`Expected at least 19 captures, got ${shots.length}`);
}
if (only.size > 0 && shots.length !== only.size) {
  throw new Error(`Expected ${only.size} targeted captures, got ${shots.length}: ${shots.map((item) => item.name).join(", ")}`);
}
