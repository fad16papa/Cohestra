import type { Activity } from "@/lib/activities-api";
import type { SharePreviewData } from "@/lib/site-builder-utils";

export function buildHomepageWhatsAppMessage(
  siteUrl: string,
  options: { siteName?: string; headline?: string } = {}
): string {
  const label =
    options.headline?.trim() ||
    options.siteName?.trim() ||
    "our upcoming community activities";

  return [
    `Check out ${label}!`,
    "",
    `Browse events and register here: ${siteUrl.replace(/\/$/, "") || siteUrl}`,
  ].join("\n");
}

export function buildActivityWhatsAppMessage(
  activity: Pick<Activity, "name" | "schedule" | "location">,
  registrationUrl: string
): string {
  const lines = [
    `Join us at ${activity.name}!`,
    "",
    activity.schedule.trim() ? `When: ${activity.schedule.trim()}` : null,
    activity.location.trim() ? `Where: ${activity.location.trim()}` : null,
    "",
    `Register here: ${registrationUrl}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

export function buildActivitySharePreview(
  activity: Pick<
    Activity,
    "name" | "schedule" | "location" | "communityLabel" | "heroImageUrl"
  >,
  registrationUrl: string
): SharePreviewData {
  const descriptionParts = [
    activity.schedule.trim(),
    activity.location.trim(),
    activity.communityLabel.trim(),
  ].filter(Boolean);

  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(" · ")
      : `Register for ${activity.name}.`;

  return {
    url: registrationUrl,
    title: activity.name,
    description: description.slice(0, 200),
    imageUrl: activity.heroImageUrl,
  };
}

export function buildActivitySharePackText(
  activity: Pick<Activity, "name" | "schedule" | "location" | "slug">,
  registrationUrl: string
): string {
  return [
    `${activity.name} — share kit`,
    "",
    `Public link: ${registrationUrl}`,
    "",
    "WhatsApp message:",
    buildActivityWhatsAppMessage(activity, registrationUrl),
    "",
    "Tip: Print the QR PNG for on-site sign-ups, or paste the WhatsApp message in your community chat.",
  ].join("\n");
}

export function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export function downloadBlobFile(filename: string, blob: Blob): void {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
