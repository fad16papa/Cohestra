import type { Activity } from "@/lib/activities-api";

export const builderTextareaClassName =
  "flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const builderSelectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type CtaTargetOption = {
  value: string;
  label: string;
};

export function buildCtaTargetOptions(activities: Activity[]): CtaTargetOption[] {
  const options: CtaTargetOption[] = [
    { value: "scroll-upcoming", label: "Scroll to events" },
    { value: "__external__", label: "External URL" },
  ];

  for (const activity of activities) {
    if (activity.status !== "published") {
      continue;
    }

    options.push({
      value: `activity:${activity.slug}`,
      label: activity.name,
    });
  }

  return options;
}

export function readCta(
  props: Record<string, unknown>,
  key: string
): { label: string; target: string } {
  const cta = props[key];
  if (typeof cta !== "object" || cta === null) {
    return { label: "", target: "scroll-upcoming" };
  }

  const record = cta as Record<string, unknown>;
  return {
    label: typeof record.label === "string" ? record.label : "",
    target: typeof record.target === "string" ? record.target : "scroll-upcoming",
  };
}

export function resolveCtaTargetOptions(
  options: CtaTargetOption[],
  target: string
): CtaTargetOption[] {
  if (options.some((option) => option.value === target)) {
    return options;
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return [...options, { value: target, label: target }];
  }

  if (target.startsWith("activity:")) {
    const slug = target.slice("activity:".length).trim();
    return [
      ...options,
      {
        value: target,
        label: slug
          ? `${slug} (unpublished or missing)`
          : "Invalid activity (unpublished or missing)",
      },
    ];
  }

  return [...options, { value: target, label: target }];
}

export function campaignAssetPath(assetId: string): string {
  return `/api/v1/public/campaign-assets/${assetId}`;
}
