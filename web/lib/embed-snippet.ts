export const EMBED_RESIZE_MESSAGE_TYPE = "cohestra-embed-resize";
export const EMBED_IFRAME_ID = "cohestra-registration-embed";

export type EmbedResizeMessage = {
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildActivityEmbedPath(registrationPath: string): string {
  const trimmed = registrationPath.trim();
  if (!trimmed) {
    return "/embed/register/";
  }

  if (trimmed.startsWith("/embed/register/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/register/")) {
    return trimmed.replace(/^\/register\//, "/embed/register/");
  }

  return `/embed/register/${trimmed.replace(/^\//, "")}`;
}

export function buildActivityEmbedUrl(registrationUrl: string, registrationPath: string): string {
  const embedPath = buildActivityEmbedPath(registrationPath);

  try {
    const url = new URL(registrationUrl);
    url.pathname = embedPath;
    return url.toString();
  } catch {
    if (registrationUrl.endsWith(registrationPath)) {
      return `${registrationUrl.slice(0, -registrationPath.length)}${embedPath}`;
    }

    return registrationUrl.replace("/register/", "/embed/register/");
  }
}

export function buildActivityEmbedIframeSnippet(
  embedUrl: string,
  activityName: string,
  iframeId = EMBED_IFRAME_ID
): string {
  const title = escapeHtmlAttr(`Register for ${activityName}`);
  const src = escapeHtmlAttr(embedUrl);
  return `<iframe id="${iframeId}" src="${src}" title="${title}" style="width:100%;border:0;" loading="lazy"></iframe>`;
}

export function buildEmbedResizeListenerSnippet(
  iframeId = EMBED_IFRAME_ID,
  allowedOrigin = "YOUR_COHESTRA_ORIGIN"
): string {
  return `window.addEventListener("message", (event) => {
  if (event.origin !== "${allowedOrigin}") return;
  if (event.data?.type !== "${EMBED_RESIZE_MESSAGE_TYPE}") return;
  const h = Number(event.data.height);
  if (!Number.isFinite(h) || h < 0 || h > 10000) return;
  const frame = document.getElementById("${iframeId}");
  if (frame) frame.style.height = h + "px";
});`;
}

/** Full copy-paste bundle: iframe HTML + parent resize listener. */
export function buildActivityEmbedCopyBundle(
  embedUrl: string,
  activityName: string
): string {
  const iframe = buildActivityEmbedIframeSnippet(embedUrl, activityName);
  const listener = buildEmbedResizeListenerSnippet();
  return [
    `<!-- Campaign tracking: append Hidden field keys to iframe src, e.g. ${embedUrl}?ref=wa -->`,
    iframe,
    "<!-- Paste on the parent page (replace YOUR_COHESTRA_ORIGIN with your tenant site origin) -->",
    `<script>${listener}</script>`,
  ].join("\n");
}
