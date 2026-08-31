import { describe, expect, it } from "vitest";

import {
  buildActivityEmbedIframeSnippet,
  buildActivityEmbedPath,
  buildActivityEmbedUrl,
} from "./embed-snippet";

describe("embed-snippet", () => {
  it("builds embed path from registration path", () => {
    expect(buildActivityEmbedPath("/register/saturday-pickleball")).toBe(
      "/embed/register/saturday-pickleball"
    );
  });

  it("builds embed url from registration url and path", () => {
    expect(
      buildActivityEmbedUrl(
        "https://club.example.com/register/saturday-pickleball",
        "/register/saturday-pickleball"
      )
    ).toBe("https://club.example.com/embed/register/saturday-pickleball");
  });

  it("builds iframe snippet with title and src", () => {
    const snippet = buildActivityEmbedIframeSnippet(
      "https://club.example.com/embed/register/saturday-pickleball",
      "Saturday Pickleball"
    );

    expect(snippet).toContain('src="https://club.example.com/embed/register/saturday-pickleball"');
    expect(snippet).toContain('title="Register for Saturday Pickleball"');
    expect(snippet).toContain("<iframe");
  });
});
