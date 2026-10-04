import { describe, expect, it } from "vitest";

import {
  CampaignRequestError,
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

describe("CampaignRequestError", () => {
  it("preserves HTTP status for denied vs retry presentation", () => {
    const error = new CampaignRequestError("Your role cannot open Campaigns.", 403);
    expect(error.status).toBe(403);
    expect(error.name).toBe("CampaignRequestError");
  });
});
