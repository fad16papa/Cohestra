import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXIT, runLifecycle, type LifecycleEnv } from "./harness";

const SHA = "830adc140d3aa45edd9df70af8664789b25c2296";
const TENANT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function env(overrides: Partial<LifecycleEnv> = {}): LifecycleEnv {
  const dir = mkdtempSync(join(tmpdir(), "lifecycle-"));
  const gatePath = join(dir, "gate.json");
  writeFileSync(gatePath, JSON.stringify({ lifecycleOpen: true }));
  return {
    UAT_AUTO_LIFECYCLE_ENABLED: "true",
    UAT_PUBLIC_BASE_URL: "https://uat.cohestra.app",
    UAT_AUTO_PLATFORM_ADMIN_EMAIL: "uat-lifecycle-admin@example.invalid",
    UAT_AUTO_PLATFORM_ADMIN_PASSWORD: "not-a-real-secret",
    TARGET_SHA: SHA,
    GITHUB_RUN_ID: "39004625819",
    GITHUB_ENVIRONMENT: "uat",
    LIFECYCLE_GATE_PATH: gatePath,
    LIFECYCLE_EVIDENCE_PATH: join(dir, "evidence.json"),
    ...overrides,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("19.5 lifecycle harness", () => {
  it("skips when the opt-in flag is off", async () => {
    const result = await runLifecycle(env({ UAT_AUTO_LIFECYCLE_ENABLED: "false" }), async () => {
      throw new Error("network should not run");
    });
    expect(result.code).toBe(EXIT.ok);
    expect(result.evidence.result).toBe("skip");
  });

  it("returns a credentials owner gate without calling privileged APIs", async () => {
    const result = await runLifecycle(env({ UAT_AUTO_PLATFORM_ADMIN_PASSWORD: "" }), async () => {
      throw new Error("network should not run");
    });
    expect(result.code).toBe(EXIT.credentialsMissing);
    expect(result.evidence.ownerGate).toBe("platform_admin_credentials_missing");
  });

  it("refuses an externally supplied tenant id", async () => {
    const result = await runLifecycle(env({ UAT_LIFECYCLE_TENANT_ID: TENANT_ID }), async () => {
      throw new Error("network should not run");
    });
    expect(result.code).toBe(EXIT.fail);
    expect(result.evidence.reason).toBe("external_tenant_id");
  });

  it("requests bootstrap on first 401 and fails closed after a bootstrap attempt", async () => {
    const first = await runLifecycle(env(), async () => json({ title: "Unauthorized" }, 401));
    expect(first.code).toBe(EXIT.needsBootstrap);

    const second = await runLifecycle(env({ LIFECYCLE_BOOTSTRAP_ATTEMPTED: "true" }), async () =>
      json({ title: "Unauthorized" }, 401),
    );
    expect(second.code).toBe(EXIT.credentialsMissing);
    expect(second.evidence.ownerGate).toBe("platform_admin_credentials_missing");
  });

  it("fails closed when /platform/me includes a tenant role", async () => {
    const result = await runLifecycle(env(), async (url) => {
      if (url.endsWith("/login")) {
        return json({ accessToken: "token", refreshToken: "r", expiresInSeconds: 60 });
      }
      if (url.endsWith("/platform/me")) {
        return json({ userId: "1", email: "hidden", roles: ["PlatformAdmin", "TenantAdmin"] });
      }
      throw new Error(`unexpected ${url}`);
    });
    expect(result.code).toBe(EXIT.bootstrapConflict);
    expect(result.evidence.ownerGate).toBe("platform_admin_bootstrap_conflict");
    expect(result.evidence.roleExclusivity).toBe("FAIL");
  });

  it("pins the create response and proves the public lifecycle matrix", async () => {
    const input = env();
    let phase: "active" | "suspended" | "archived" = "active";
    let createdSlug = "";

    const result = await runLifecycle(input, async (url, init) => {
      if (/paddle|complimentary|picklemania|creativorare|default/.test(url)) {
        throw new Error(`disallowed ${url}`);
      }
      if (url.endsWith("/login")) {
        return json({ accessToken: "token", refreshToken: "r", expiresInSeconds: 60 });
      }
      if (url.endsWith("/platform/me")) {
        return json({ userId: "1", email: "hidden", roles: ["PlatformAdmin"] });
      }
      if (url.endsWith("/platform/tenants") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { slug: string; plan: string; isComplimentary: boolean };
        expect(body.plan).toBe("Basic");
        expect(body.isComplimentary).toBe(true);
        expect(body.slug.startsWith("uat-19-5-lifecycle-")).toBe(true);
        createdSlug = body.slug;
        return json(
          {
            id: TENANT_ID,
            slug: body.slug,
            plan: "Basic",
            status: "Active",
            billingStatus: "Free",
            isComplimentary: true,
          },
          201,
        );
      }
      if (url.endsWith(`/${TENANT_ID}/suspend`)) {
        phase = "suspended";
        return json({ id: TENANT_ID, slug: createdSlug, status: "Suspended" });
      }
      if (url.endsWith(`/${TENANT_ID}/reactivate`)) {
        phase = "active";
        return json({ id: TENANT_ID, status: "Active" });
      }
      if (url.endsWith(`/${TENANT_ID}/archive`)) {
        phase = "archived";
        return json({ id: TENANT_ID, status: "Archived", archivedAt: "2026-10-17T05:00:00Z" });
      }
      if (url.includes("/platform/audits")) {
        const action = new URL(url).searchParams.get("action");
        return json({ items: [{ action }] });
      }
      if (url.endsWith("/api/v1/public/door")) {
        expect(url).toContain(`${createdSlug}.uat.cohestra.app`);
        return json({ kind: phase });
      }
      if (url === `https://${createdSlug}.uat.cohestra.app/`) {
        if (phase === "suspended") {
          return new Response("Workspace paused", { status: 200 });
        }
        if (phase === "archived") {
          return new Response("Page not found", { status: 404 });
        }
        return new Response("Active workspace", { status: 200 });
      }
      throw new Error(`unexpected ${url}`);
    });

    expect(result.code).toBe(EXIT.ok);
    expect(result.evidence.result).toBe("pass");
    expect(result.evidence.tenantId).toBe(TENANT_ID);
    expect(result.evidence.paddleMutation).toBe("NONE");
    const written = JSON.parse(readFileSync(input.LIFECYCLE_EVIDENCE_PATH as string, "utf8")) as {
      tenantSlug: string;
    };
    expect(written.tenantSlug.startsWith("uat-19-5-lifecycle-")).toBe(true);
    expect(written.tenantSlug).toBe(createdSlug);
  });
});
