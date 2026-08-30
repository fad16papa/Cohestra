export const scaleFieldValues = ["1", "2", "3", "4", "5"] as const;

export type ScaleFieldValue = (typeof scaleFieldValues)[number];

export const scaleFieldLabels: Record<ScaleFieldValue, string> = {
  "1": "Beginner",
  "2": "Getting started",
  "3": "Intermediate",
  "4": "Advanced",
  "5": "Expert",
};

export function isScaleFieldValue(value: string): value is ScaleFieldValue {
  return scaleFieldValues.includes(value as ScaleFieldValue);
}

export function getScaleFieldLabel(value: string): string | null {
  return isScaleFieldValue(value) ? scaleFieldLabels[value] : null;
}
