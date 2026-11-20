import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-master-fields.tsx"),
  "utf8"
);
const CONTACT = readFileSync(
  resolve(import.meta.dirname, "../components/clients/contact-number-field.tsx"),
  "utf8"
);
const DISPLAY = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-phone-display.tsx"),
  "utf8"
);
const HISTORY = readFileSync(
  resolve(import.meta.dirname, "../components/clients/client-registration-history.tsx"),
  "utf8"
);
const BILLING = readFileSync(
  resolve(import.meta.dirname, "../components/billing/in-app-billing-panel.tsx"),
  "utf8"
);
const ACTIVITY_FORM = readFileSync(
  resolve(import.meta.dirname, "../components/activities/form-field-editor.tsx"),
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
    expect(SOURCE).toContain('layout="master-profile"');
    expect(SOURCE).toContain(
      'field.label === "Name" || field.label === "Notes"'
    );

    const contactAt = SOURCE.indexOf("<ContactNumberField");
    const emailAt = SOURCE.indexOf('htmlFor="master-email"');
    const professionAt = SOURCE.indexOf('htmlFor="master-profession"');
    expect(contactAt).toBeGreaterThan(-1);
    expect(emailAt).toBeGreaterThan(contactAt);
    expect(professionAt).toBeGreaterThan(emailAt);
  });

  it("shows the selected contact as flag, dialing prefix, and number", () => {
    expect(CONTACT).toContain('data-contact-layout="flag-prefix-number"');
    expect(CONTACT).toContain('data-contact-separator="prefix"');
    expect(CONTACT).toContain("> | </span>");
    expect(CONTACT).toContain('data-contact-separator="number"');
    expect(CONTACT).toContain("> - </span>");
    expect(CONTACT).toContain("flex-nowrap");
    expect(CONTACT).toContain("{option.flag}");
    expect(CONTACT).toContain("{option.name}");
    expect(CONTACT).toContain("+{option.callingCode}");
    expect(CONTACT).toContain("hideChevron");

    expect(DISPLAY).toContain('layout === "master-profile"');
    expect(DISPLAY).toContain('data-contact-layout="flag-prefix-number"');
    expect(DISPLAY).toContain("> | </span>");
    expect(DISPLAY).toContain("> - </span>");
    expect(DISPLAY).toContain(
      '<span aria-hidden className="font-medium text-text-muted-warm">'
    );
    expect(DISPLAY).toContain('<span aria-hidden className="text-text-warm">');
    expect(HISTORY).not.toContain('layout="master-profile"');
    expect(BILLING).toContain("PhoneCountrySelect");
    expect(ACTIVITY_FORM).toContain("PhoneCountrySelect");
  });

  it("still saves the same master-profile payload fields", () => {
    expect(SOURCE).toContain("phone: form.phoneLocal.trim() || null");
    expect(SOURCE).toContain("phoneCountry: form.phoneCountry");
    expect(SOURCE).toContain("nationality: form.nationality.trim() || null");
    expect(SOURCE).toContain("email: form.email.trim() || null");
  });
});
