import { describe, expect, it } from "vitest";

import {
  buildPaddleCheckoutReturnUrl,
  isPaddleTransactionId,
  resolvePaddleApexReturnRedirectUrl,
} from "@/lib/billing/paddle-return";

describe("paddle-return", () => {
  it("accepts Paddle transaction ids", () => {
    expect(isPaddleTransactionId("txn_01m0t971y3gby0hbagesyewerj")).toBe(true);
    expect(isPaddleTransactionId("txn_")).toBe(false);
    expect(isPaddleTransactionId("session_abc")).toBe(false);
  });

  it("builds the slug-free apex return URL for local Docker and production", () => {
    expect(buildPaddleCheckoutReturnUrl("http://creativorare.localhost:8088")).toBe(
      "http://localhost:8088/billing/paddle-return"
    );
    expect(
      buildPaddleCheckoutReturnUrl(
        "http://creativorare.localhost:8088",
        "txn_01abc"
      )
    ).toBe("http://localhost:8088/billing/paddle-return?_ptxn=txn_01abc");
    expect(buildPaddleCheckoutReturnUrl("https://ikigai.cohestra.app")).toBe(
      "https://cohestra.app/billing/paddle-return"
    );
  });

  it("rewrites apex leftover _ptxn landings and leaves tenant hosts alone", () => {
    expect(
      resolvePaddleApexReturnRedirectUrl(
        "http://localhost:8088",
        "/pricing",
        "txn_01m0t971y3gby0hbagesyewerj"
      )
    ).toBe(
      "http://localhost:8088/billing/paddle-return?_ptxn=txn_01m0t971y3gby0hbagesyewerj"
    );
    expect(
      resolvePaddleApexReturnRedirectUrl(
        "https://cohestra.app",
        "/pricing",
        "txn_01m0t971y3gby0hbagesyewerj"
      )
    ).toBe(
      "https://cohestra.app/billing/paddle-return?_ptxn=txn_01m0t971y3gby0hbagesyewerj"
    );
    expect(
      resolvePaddleApexReturnRedirectUrl(
        "http://creativorare.localhost:8088",
        "/dashboard",
        "txn_01m0t971y3gby0hbagesyewerj"
      )
    ).toBeNull();
    expect(
      resolvePaddleApexReturnRedirectUrl(
        "http://localhost:8088",
        "/billing/paddle-return",
        "txn_01m0t971y3gby0hbagesyewerj"
      )
    ).toBeNull();
  });
});
