import { toWhatsAppPhoneDigits } from "@/lib/phone-countries";

/** Viber P2P chat deep link — requires Viber desktop/mobile installed. */
export function buildViberAppDeepLink(
  phone: string | null | undefined
): string | null {
  const digits = toWhatsAppPhoneDigits(phone);
  if (!digits) {
    return null;
  }

  return `viber://chat?number=%2B${digits}`;
}

/** Opens a custom app protocol without spawning a blank browser tab. */
export function openAppDeepLink(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function buildWhatsAppWebUrl(
  phone: string | null | undefined
): string | null {
  const digits = toWhatsAppPhoneDigits(phone);
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
}
