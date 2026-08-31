export const EMBED_RESIZE_MESSAGE_TYPE = "cohestra-embed-resize";

export type EmbedResizeMessage = {
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

export function buildActivityEmbedPath(registrationPath: string): string {
  if (registrationPath.startsWith("/embed/register/")) {
    return registrationPath;
  }

  if (registrationPath.startsWith("/register/")) {
    return registrationPath.replace(/^\/register\//, "/embed/register/");
  }

  return `/embed/register/${registrationPath.replace(/^\//, "")}`;
}

export function buildActivityEmbedUrl(registrationUrl: string, registrationPath: string): string {
  const embedPath = buildActivityEmbedPath(registrationPath);
  if (registrationUrl.endsWith(registrationPath)) {
    return `${registrationUrl.slice(0, -registrationPath.length)}${embedPath}`;
  }

  return registrationUrl.replace("/register/", "/embed/register/");
}

export function buildActivityEmbedIframeSnippet(
  embedUrl: string,
  activityName: string
): string {
  const title = `Register for ${activityName}`.replace(/"/g, "&quot;");
  return `<iframe src="${embedUrl}" title="${title}" style="width:100%;border:0;" loading="lazy"></iframe>`;
}

export function buildEmbedResizeListenerSnippet(iframeId = "cohestra-registration-embed"): string {
  return `window.addEventListener("message", (event) => {
  if (event.data?.type !== "${EMBED_RESIZE_MESSAGE_TYPE}") return;
  const frame = document.getElementById("${iframeId}");
  if (frame) frame.style.height = \`\${event.data.height}px\`;
});`;
}
