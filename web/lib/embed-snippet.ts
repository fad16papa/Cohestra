export const EMBED_RESIZE_MESSAGE_TYPE = "cohestra-embed-resize";
export const EMBED_IFRAME_ID = "cohestra-registration-embed";
export const EMBED_MAX_REPORTED_HEIGHT = 10000;

export type EmbedResizeMessage = {
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/[\n\r\t]/g, " ")
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

export function buildCampaignQueryExample(
  embedUrl: string,
  param = "ref",
  value = "wa"
): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set(param, value);
    return url.toString();
  } catch {
    const separator = embedUrl.includes("?") ? "&" : "?";
    return `${embedUrl}${separator}${param}=${encodeURIComponent(value)}`;
  }
}

export function buildActivityEmbedIframeSnippet(
  embedUrl: string,
  activityName: string,
  iframeId = EMBED_IFRAME_ID
): string {
  const title = escapeHtmlAttr(`Register for ${activityName}`);
  const src = escapeHtmlAttr(embedUrl);
  return `<iframe id="${iframeId}" src="${src}" title="${title}" style="width:100%;border:0;"></iframe>`;
}

export function buildEmbedResizeListenerSnippet(
  iframeId = EMBED_IFRAME_ID,
  allowedOrigin = "YOUR_COHESTRA_ORIGIN"
): string {
  return `window.addEventListener("message", (event) => {
  if (event.origin !== "${allowedOrigin}") return;
  if (event.data?.type !== "${EMBED_RESIZE_MESSAGE_TYPE}") return;
  const h = Number(event.data.height);
  if (!Number.isFinite(h) || h <= 0 || h > ${EMBED_MAX_REPORTED_HEIGHT}) return;
  const frame = document.getElementById("${iframeId}");
  if (!frame || event.source !== frame.contentWindow) return;
  frame.style.height = h + "px";
});`;
}

/** Full copy-paste bundle: iframe HTML + parent resize listener. */
export function buildActivityEmbedCopyBundle(
  embedUrl: string,
  activityName: string
): string {
  const iframe = buildActivityEmbedIframeSnippet(embedUrl, activityName);
  const listener = buildEmbedResizeListenerSnippet();
  const campaignExample = buildCampaignQueryExample(embedUrl);
  return [
    `<!-- Campaign tracking: append Hidden field keys to iframe src, e.g. ${campaignExample} -->`,
    iframe,
    "<!-- Paste on the parent page (replace YOUR_COHESTRA_ORIGIN with your tenant site origin) -->",
    `<script>${listener}</script>`,
  ].join("\n");
}
