import { describe, expect, it } from "vitest";

import {
  CampaignRequestError,
  isAuthoritativeReadyCount,
  isComposeSegmentReady,
  isValidSegmentQuery,
} from "./campaigns-api";

describe("campaign compose eligibility", () => {
  it("requires a community and consent-only targeting", () => {
    expect(isComposeSegmentReady({})).toBe(false);
    expect(isComposeSegmentReady({ community: "Harbour", consentOnly: false })).toBe(
      false
    );
    expect(isComposeSegmentReady({ community: "Harbour", consentOnly: true })).toBe(
      true
    );
  });

  it("does not treat an empty client-id list as a valid segment", () => {
    expect(isValidSegmentQuery({ clientIds: [] })).toBe(false);
    expect(isValidSegmentQuery({ community: "Harbour" })).toBe(true);
  });
});

describe("authoritative ready count", () => {
  it("rejects zero, NaN, Infinity, and non-integers", () => {
    expect(isAuthoritativeReadyCount(2)).toBe(true);
    expect(isAuthoritativeReadyCount(0)).toBe(false);
    expect(isAuthoritativeReadyCount(Number.NaN)).toBe(false);
    expect(isAuthoritativeReadyCount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isAuthoritativeReadyCount(1.5)).toBe(false);
    expect(isAuthoritativeReadyCount("2")).toBe(false);
  });
});

describe("CampaignRequestError", () => {
  it("preserves HTTP status for denied vs retry presentation", () => {
    const error = new CampaignRequestError("Your role cannot open Campaigns.", 403);
    expect(error.status).toBe(403);
    expect(error.name).toBe("CampaignRequestError");
  });
});
