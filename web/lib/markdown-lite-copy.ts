import { normalizeParticipantCopyLineEndings } from "@/lib/registration-piping";

export function sanitizeMarkdownLite(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function splitMarkdownLiteParagraphs(value: string): string[] {
  const normalized = normalizeParticipantCopyLineEndings(sanitizeMarkdownLite(value));
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function hasRenderableMarkdownLiteCopy(value: string | null | undefined): boolean {
  return splitMarkdownLiteParagraphs(value ?? "").length > 0;
}
