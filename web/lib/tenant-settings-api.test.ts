import { describe, expect, it } from "vitest";

import { parseEmbedSettingsResponse } from "./tenant-settings-api";

describe("parseEmbedSettingsResponse", () => {
  it("parses camelCase payload", () => {
    expect(
      parseEmbedSettingsResponse({
        allowedEmbedOrigins: ["https://club.example.com"],
      })
    ).toEqual({ allowedEmbedOrigins: ["https://club.example.com"] });
  });

  it("parses PascalCase payload", () => {
    expect(
      parseEmbedSettingsResponse({
        AllowedEmbedOrigins: ["https://www.notion.so"],
      })
    ).toEqual({ allowedEmbedOrigins: ["https://www.notion.so"] });
  });

  it("returns empty list when missing", () => {
    expect(parseEmbedSettingsResponse({})).toEqual({ allowedEmbedOrigins: [] });
  });
});
