import { describe, expect, it } from "vitest";

import {
  EMBED_IFRAME_ID,
  EMBED_MAX_REPORTED_HEIGHT,
  buildActivityEmbedCopyBundle,
  buildActivityEmbedIframeSnippet,
  buildActivityEmbedPath,
  buildActivityEmbedUrl,
  buildCampaignQueryExample,
  buildEmbedResizeListenerSnippet,
} from "./embed-snippet";

describe("embed-snippet", () => {
  it("builds embed path from registration path", () => {
    expect(buildActivityEmbedPath("/register/saturday-pickleball")).toBe(
      "/embed/register/saturday-pickleball"
    );
  });

  it("builds embed url from registration url and path via URL API", () => {
    expect(
      buildActivityEmbedUrl(
        "https://club.example.com/register/saturday-pickleball",
        "/register/saturday-pickleball"
      )
    ).toBe("https://club.example.com/embed/register/saturday-pickleball");
  });

  it("preserves query string on registration url when rebuilding pathname", () => {
    expect(
      buildActivityEmbedUrl(
        "https://club.example.com/register/saturday-pickleball?utm=email",
        "/register/saturday-pickleball"
      )
    ).toBe("https://club.example.com/embed/register/saturday-pickleball?utm=email");
  });

  it("builds iframe snippet with id, title, and escaped src", () => {
    const snippet = buildActivityEmbedIframeSnippet(
      "https://club.example.com/embed/register/saturday-pickleball",
      "Saturday Pickleball"
    );

    expect(snippet).toContain(`id="${EMBED_IFRAME_ID}"`);
    expect(snippet).toContain('src="https://club.example.com/embed/register/saturday-pickleball"');
    expect(snippet).toContain('title="Register for Saturday Pickleball"');
    expect(snippet).toContain("<iframe");
    expect(snippet).not.toContain('loading="lazy"');
  });

  it("collapses newlines in activity name for title attribute", () => {
    const snippet = buildActivityEmbedIframeSnippet(
      "https://club.example.com/embed/register/x",
      "Line one\nLine two"
    );

    expect(snippet).toContain('title="Register for Line one Line two"');
    expect(snippet).not.toContain("\n");
  });

  it("escapes special characters in activity name for title attribute", () => {
    const snippet = buildActivityEmbedIframeSnippet(
      "https://club.example.com/embed/register/x",
      'Fun "Event" & More'
    );

    expect(snippet).toContain('title="Register for Fun &quot;Event&quot; &amp; More"');
  });

  it("resize listener validates origin, source, and height", () => {
    const listener = buildEmbedResizeListenerSnippet();
    expect(listener).toContain('event.origin !== "YOUR_COHESTRA_ORIGIN"');
    expect(listener).toContain("event.source !== frame.contentWindow");
    expect(listener).toContain("h <= 0");
    expect(listener).toContain(String(EMBED_MAX_REPORTED_HEIGHT));
    expect(listener).toContain(`getElementById("${EMBED_IFRAME_ID}")`);
  });

  it("builds campaign query example appending to existing search params", () => {
    expect(
      buildCampaignQueryExample(
        "https://club.example.com/embed/register/saturday-pickleball?utm=email"
      )
    ).toBe(
      "https://club.example.com/embed/register/saturday-pickleball?utm=email&ref=wa"
    );
  });

  it("copy bundle includes iframe, listener, and campaign query hint", () => {
    const bundle = buildActivityEmbedCopyBundle(
      "https://club.example.com/embed/register/saturday-pickleball",
      "Saturday Pickleball"
    );

    expect(bundle).toContain("?ref=wa");
    expect(bundle).toContain(`id="${EMBED_IFRAME_ID}"`);
    expect(bundle).toContain("<script>");
    expect(bundle).toContain(EMBED_IFRAME_ID);
  });
});
