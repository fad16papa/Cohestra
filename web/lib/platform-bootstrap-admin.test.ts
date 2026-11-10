import { describe, expect, it } from "vitest";

import { bootstrapFirstAdmin } from "@/lib/platform-api";

describe("bootstrapFirstAdmin", () => {
  it("posts confirmed email to bootstrap-admin and parses response", async () => {
    const tenantId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const email = "admin@pilot.example";

    let capturedUrl = "";
    let capturedBody: unknown;

    const result = await bootstrapFirstAdmin(
      async (input, init) => {
        capturedUrl = input;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return new Response(
          JSON.stringify({
            tenantId,
            inviteId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            email,
            expiresAt: "2026-11-10T12:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
      tenantId,
      email
    );

    expect(capturedUrl).toContain(`/api/v1/platform/tenants/${tenantId}/bootstrap-admin`);
    expect(capturedBody).toEqual({ email });
    expect(result.email).toBe(email);
    expect(result.expiresAt).toBe("2026-11-10T12:00:00Z");
    expect(result.tenantId).toBe(tenantId);
  });
});
