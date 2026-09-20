export const REGISTRATION_PREVIEW_VIEWPORTS = ["mobile", "tablet", "desktop"] as const;

export type RegistrationPreviewViewport = (typeof REGISTRATION_PREVIEW_VIEWPORTS)[number];

export const REGISTRATION_PREVIEW_VIEWPORT_WIDTHS = {
  mobile: 390,
  tablet: 768,
  desktopCentered: 720,
  desktopSplit: 960,
} as const;

export const REGISTRATION_PREVIEW_VIEWPORT_STORAGE_KEY =
  "cohestra.form-studio.preview-viewport";

export function isRegistrationPreviewViewport(
  value: string | null | undefined
): value is RegistrationPreviewViewport {
  return (
    value === "mobile" || value === "tablet" || value === "desktop"
  );
}

export function readStoredRegistrationPreviewViewport(
  storage: Pick<Storage, "getItem"> | null | undefined
): RegistrationPreviewViewport {
  if (!storage) {
    return "mobile";
  }

  try {
    const stored = storage.getItem(REGISTRATION_PREVIEW_VIEWPORT_STORAGE_KEY);
    return isRegistrationPreviewViewport(stored) ? stored : "mobile";
  } catch {
    return "mobile";
  }
}

export function persistRegistrationPreviewViewport(
  storage: Pick<Storage, "setItem"> | null | undefined,
  viewport: RegistrationPreviewViewport
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(REGISTRATION_PREVIEW_VIEWPORT_STORAGE_KEY, viewport);
  } catch {
    // sessionStorage may be unavailable (private mode / tests).
  }
}

export function registrationPreviewSurfaceMaxWidthClass(
  viewport: RegistrationPreviewViewport,
  layout: string | null | undefined
): string {
  if (viewport === "mobile") {
    return "max-w-[390px]";
  }

  if (viewport === "tablet") {
    return "max-w-[768px]";
  }

  if (layout === "split") {
    return "max-w-[960px]";
  }

  if (layout === "centered" || layout === "card" || layout === "immersive") {
    return "max-w-[720px]";
  }

  return "max-w-[720px]";
}
