import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  startInviteActivation,
  verifyInviteActivation,
} from "@/lib/team/team-api";

describe("startInviteActivation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("sessionStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts token and nickname only", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          codeSent: true,
          maskedEmail: "a***@example.com",
          expiresInSeconds: 600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await startInviteActivation("invite-token-1", "Alex");

    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ token: "invite-token-1", nickname: "Alex" });
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("email");
    expect(result.maskedEmail).toBe("a***@example.com");
    expect(result.codeSent).toBe(true);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});

describe("verifyInviteActivation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("sessionStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts token, password, nickname, and code", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          email: "alex@example.com",
          tenantSlug: "pilot",
          createdAccount: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await verifyInviteActivation(
      "invite-token-1",
      "secret-pass",
      "Alex",
      "123456"
    );

    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      token: "invite-token-1",
      password: "secret-pass",
      nickname: "Alex",
      code: "123456",
    });
    expect(result.email).toBe("alex@example.com");
    expect(result.tenantSlug).toBe("pilot");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
