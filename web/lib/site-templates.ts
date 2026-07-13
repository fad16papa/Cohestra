export type SiteBuiltInPresetId = "community" | "minimal" | "showcase" | "event-hub";

export type SiteBuiltInPreset = {
  id: SiteBuiltInPresetId;
  label: string;
  description: string;
};

export const SITE_BUILT_IN_PRESETS: SiteBuiltInPreset[] = [
  {
    id: "community",
    label: "Community",
    description: "Hero, highlights, how it works, upcoming events, and footer.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Streamlined hero and upcoming events for a lighter homepage.",
  },
  {
    id: "showcase",
    label: "Marketing showcase",
    description:
      "Carousel, testimonials, stats, FAQ, upcoming events, and a CTA band.",
  },
  {
    id: "event-hub",
    label: "Event hub",
    description: "Carousel, upcoming events, highlights, FAQ, and a CTA band.",
  },
];

export function getBuiltInPresetLabel(presetId: SiteBuiltInPresetId): string {
  return SITE_BUILT_IN_PRESETS.find((preset) => preset.id === presetId)?.label ?? presetId;
}
