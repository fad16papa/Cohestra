export const DOCS_SCREENSHOT_PREFIX = "/docs-screenshots/";

export type DocsImageBlock = {
  type: "image";
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export function isAllowedDocsImageSrc(src: string): boolean {
  if (!src.startsWith(DOCS_SCREENSHOT_PREFIX)) {
    return false;
  }
  if (src.includes("..") || src.includes("://") || src.includes("\\")) {
    return false;
  }
  return /^\/docs-screenshots\/[a-z0-9][a-z0-9._-]*\.(png|webp)$/.test(src);
}

export function docsImageAspectRatio(width: number, height: number): string {
  return `${width} / ${height}`;
}
