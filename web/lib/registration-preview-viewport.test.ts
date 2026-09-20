import { describe, expect, it } from "vitest";

import {
  isRegistrationPreviewViewport,
  persistRegistrationPreviewViewport,
  readStoredRegistrationPreviewViewport,
  registrationPreviewSurfaceMaxWidthClass,
  REGISTRATION_PREVIEW_VIEWPORT_STORAGE_KEY,
} from "@/lib/registration-preview-viewport";

describe("registration preview viewport", () => {
  it("accepts only Desktop / Tablet / Mobile ids", () => {
    expect(isRegistrationPreviewViewport("tablet")).toBe(true);
    expect(isRegistrationPreviewViewport("desktop")).toBe(true);
    expect(isRegistrationPreviewViewport("iphone")).toBe(false);
  });

  it("maps UX widths without device-brand labels", () => {
    expect(registrationPreviewSurfaceMaxWidthClass("mobile", "centered")).toBe(
      "max-w-[390px]"
    );
    expect(registrationPreviewSurfaceMaxWidthClass("tablet", "split")).toBe(
      "max-w-[768px]"
    );
    expect(registrationPreviewSurfaceMaxWidthClass("desktop", "split")).toBe(
      "max-w-[960px]"
    );
    expect(registrationPreviewSurfaceMaxWidthClass("desktop", "centered")).toBe(
      "max-w-[720px]"
    );
  });

  it("persists viewport in session storage only", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    persistRegistrationPreviewViewport(storage, "tablet");
    expect(store.get(REGISTRATION_PREVIEW_VIEWPORT_STORAGE_KEY)).toBe("tablet");
    expect(readStoredRegistrationPreviewViewport(storage)).toBe("tablet");
    expect(readStoredRegistrationPreviewViewport({ getItem: () => "nope" })).toBe(
      "mobile"
    );
  });
});
