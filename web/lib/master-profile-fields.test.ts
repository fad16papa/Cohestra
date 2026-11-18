import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-master-fields.tsx"),
  "utf8"
);

describe("master profile contact and nationality layout", () => {
  it("removes the separate mobile country field and pairs contact with email", () => {
    expect(SOURCE).not.toContain("Mobile country");
    expect(SOURCE).not.toContain("PhoneCountrySelect");
    expect(SOURCE).toContain("<ContactNumberField");
    expect(SOURCE).toContain("Email / social");
    expect(SOURCE).toContain("<NationalityField");
    expect(SOURCE).toContain('!compact && "sm:grid-cols-2"');

    const contactAt = SOURCE.indexOf("<ContactNumberField");
    const emailAt = SOURCE.indexOf('htmlFor="master-email"');
    const professionAt = SOURCE.indexOf('htmlFor="master-profession"');
    expect(contactAt).toBeGreaterThan(-1);
    expect(emailAt).toBeGreaterThan(contactAt);
    expect(professionAt).toBeGreaterThan(emailAt);
  });

  it("still saves the same master-profile payload fields", () => {
    expect(SOURCE).toContain("phone: form.phoneLocal.trim() || null");
    expect(SOURCE).toContain("phoneCountry: form.phoneCountry");
    expect(SOURCE).toContain("nationality: form.nationality.trim() || null");
    expect(SOURCE).toContain("email: form.email.trim() || null");
  });
});
