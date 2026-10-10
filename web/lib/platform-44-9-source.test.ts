import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const OVERVIEW = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/overview/page.tsx"),
  "utf8"
);
const OPS = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/ops/page.tsx"),
  "utf8"
);
const VERSION = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-ops-version.tsx"),
  "utf8"
);
const API = readFileSync(resolve(import.meta.dirname, "./platform-api.ts"), "utf8");
const DEPLOY = readFileSync(resolve(import.meta.dirname, "../../deploy/remote-deploy.sh"), "utf8");
const COMPOSE = readFileSync(resolve(import.meta.dirname, "../../docker-compose.uat.yml"), "utf8");
const ISOLATION = readFileSync(
  resolve(import.meta.dirname, "../../deploy/validate-uat-isolation.sh"),
  "utf8"
);

const MUTATION = /Rollback|Redeploy|Deploy now|SSH|Terminal|switch version|checkout commit/i;

describe("Story 44.9 version health source contract", () => {
  it("adds independent Version UI to Overview and Operations without mutation controls", () => {
    expect(OVERVIEW).toContain("PlatformOpsVersionSection");
    expect(OVERVIEW).toContain("hideLoadTest");
    expect(OVERVIEW).toContain("PlatformKpiTile");
    expect(OVERVIEW).toContain("getPlatformOpsOverview");
    expect(OPS).toContain("PlatformOpsVersionSection");
    expect(OPS).toContain("getPlatformOpsHealth");
    expect(OPS).toContain("PlatformOpsPaddleSection");
    expect(OPS).toContain("PlatformOpsOutboxSection");
    expect(VERSION).toContain("getPlatformOpsVersion");
    expect(VERSION).toContain("Loading version");
    expect(VERSION).toContain("Missing instrumentation");
    expect(VERSION).toContain("Version data unavailable");
    expect(VERSION).toContain("not currently instrumented");
    expect(VERSION).toContain("break-all");
    expect(VERSION).not.toMatch(MUTATION);
    expect(OVERVIEW).not.toMatch(MUTATION);
    expect(OPS).not.toMatch(MUTATION);
    expect(VERSION).not.toContain("DEPLOY_BRANCH");
    expect(VERSION).not.toContain("method: \"POST\"");
  });

  it("keeps the frontend parser on the existing platform-api layer", () => {
    expect(API).toContain("export async function getPlatformOpsVersion");
    expect(API).toContain("export function parsePlatformOpsVersion");
    expect(API).toContain("/api/v1/platform/ops/version");
    expect(API).toContain("FULL_GIT_SHA");
    expect(API).toContain("missing_instrumentation");
    expect(API).not.toContain("/api/v1/version");
    expect(API).not.toContain("/api/v1/system/version");
  });

  it("derives GIT_SHA after git reset and substitutes it into UAT compose", () => {
    const resetAt = DEPLOY.indexOf('git reset --hard "origin/$DEPLOY_BRANCH"');
    const shaAt = DEPLOY.indexOf('GIT_SHA="$(git rev-parse HEAD)"');
    const exportAt = DEPLOY.indexOf("export GIT_SHA");
    expect(resetAt).toBeGreaterThan(-1);
    expect(shaAt).toBeGreaterThan(resetAt);
    expect(exportAt).toBeGreaterThan(shaAt);
    expect(COMPOSE).toMatch(/GIT_SHA:\s*\$\{GIT_SHA:-\}/);
    expect(COMPOSE).not.toMatch(/GIT_SHA:\s*[0-9a-fA-F]{7,}/);
    expect(COMPOSE).toContain("127.0.0.1:${API_HOST_PORT:-5100}:8080");
    expect(COMPOSE).toContain("127.0.0.1:${WEB_HOST_PORT:-3100}:3000");
    expect(ISOLATION).toContain("git rev-parse HEAD");
    expect(ISOLATION).toContain("${GIT_SHA:-}");
  });
});
