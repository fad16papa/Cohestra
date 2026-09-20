import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  REGISTRATION_SUCCESS_CHECKIN_HINT,
  REGISTRATION_SUCCESS_HEADING,
  REGISTRATION_SUCCESS_PREVIEW_HEADING,
  REGISTRATION_SUCCESS_SAVED_PREFIX,
  registrationSuccessCopyContainsHtmlEntity,
} from "@/lib/registration-success-copy";

const SUCCESS_SCREEN_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/registration/registration-success-screen.tsx"),
  "utf8"
);

describe("registration success copy", () => {
  it("uses a plain apostrophe in the success heading", () => {
    expect(REGISTRATION_SUCCESS_HEADING).toBe("You're registered!");
    expect(REGISTRATION_SUCCESS_HEADING).not.toContain("&apos;");
    expect(REGISTRATION_SUCCESS_HEADING).not.toContain("&#39;");
    expect(registrationSuccessCopyContainsHtmlEntity(REGISTRATION_SUCCESS_HEADING)).toBe(
      false
    );
  });

  it("keeps related system copy as plain text", () => {
    for (const copy of [
      REGISTRATION_SUCCESS_PREVIEW_HEADING,
      REGISTRATION_SUCCESS_SAVED_PREFIX,
      REGISTRATION_SUCCESS_CHECKIN_HINT,
    ]) {
      expect(registrationSuccessCopyContainsHtmlEntity(copy)).toBe(false);
    }

    expect(REGISTRATION_SUCCESS_SAVED_PREFIX).toContain("We've");
    expect(REGISTRATION_SUCCESS_CHECKIN_HINT).toContain("you'll");
  });

  it("does not render success copy through raw HTML", () => {
    expect(SUCCESS_SCREEN_SOURCE).not.toContain("dangerouslySetInnerHTML");
    expect(SUCCESS_SCREEN_SOURCE).not.toMatch(/&(?:apos|quot|amp|#39);/);
    expect(SUCCESS_SCREEN_SOURCE).toContain("REGISTRATION_SUCCESS_HEADING");
  });
});
