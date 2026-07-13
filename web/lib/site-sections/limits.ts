export const MAX_SECTIONS = 12;
export const MAX_LIST_ITEMS = 6;

export type SectionVariant = "default" | "accent" | "muted";

export const SECTION_VARIANTS: { value: SectionVariant; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "accent", label: "Accent band" },
  { value: "muted", label: "Muted band" },
];

export function readSectionVariant(props: Record<string, unknown>): SectionVariant {
  const value = props.variant;
  if (value === "accent" || value === "muted") {
    return value;
  }

  return "default";
}
