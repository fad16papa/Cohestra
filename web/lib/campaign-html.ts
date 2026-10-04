const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "div",
  "span",
]);

const VOID_TAGS = new Set(["br", "img"]);

const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "target", "rel"]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const ATTR_RE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function decodeHref(value: string): string {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return "";
  }
}

export function isSafeCampaignHref(href: string): boolean {
  if (!href || href !== href.trim()) {
    return false;
  }

  const decoded = decodeHref(href);
  if (!decoded || /[\u0000-\u001F\u007F]/.test(decoded)) {
    return false;
  }

  const lower = decoded.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  if (lower.startsWith("mailto:")) {
    return lower.length > "mailto:".length && !lower.includes("javascript:");
  }

  if (lower.startsWith("//") || lower.startsWith("\\\\")) {
    return false;
  }

  return lower.startsWith("https://") || lower.startsWith("http://");
}

export function isAllowedCampaignImageSrc(src: string): boolean {
  if (!src || src !== src.trim()) {
    return false;
  }

  const decoded = decodeHref(src);
  if (!decoded) {
    return false;
  }

  try {
    const uri = new URL(decoded);
    if (uri.protocol !== "http:" && uri.protocol !== "https:") {
      return false;
    }

    return uri.pathname.toLowerCase().includes("/api/v1/public/campaign-assets/");
  } catch {
    return false;
  }
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const kept: string[] = [];
  ATTR_RE.lastIndex = 0;

  for (const match of rawAttrs.matchAll(ATTR_RE)) {
    const name = match[1]?.toLowerCase() ?? "";
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (!name || name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
      continue;
    }

    if (name === "href") {
      if (!isSafeCampaignHref(value)) {
        continue;
      }
      kept.push(`href="${value.replace(/"/g, "&quot;")}"`);
      kept.push('rel="noopener noreferrer"');
      continue;
    }

    if (name === "src") {
      if (tag !== "img" || !isAllowedCampaignImageSrc(value)) {
        continue;
      }
      kept.push(`src="${value.replace(/"/g, "&quot;")}"`);
      continue;
    }

    if (name === "target") {
      if (value === "_blank") {
        kept.push('target="_blank"');
      }
      continue;
    }

    if (name === "rel") {
      continue;
    }

    kept.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }

  return kept.length > 0 ? ` ${kept.join(" ")}` : "";
}

export function sanitizeCampaignHtml(html: string): string {
  if (!html.trim()) {
    return "";
  }

  const withoutBlocks = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return withoutBlocks.replace(TAG_RE, (full, tagName: string, rawAttrs: string) => {
    const tag = tagName.toLowerCase();
    const closing = full.startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (closing) {
      return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    }

    if (tag === "img") {
      const attrs = sanitizeAttributes(tag, rawAttrs);
      return attrs.includes("src=") ? `<img${attrs}>` : "";
    }

    if (VOID_TAGS.has(tag)) {
      return `<${tag}>`;
    }

    return `<${tag}${sanitizeAttributes(tag, rawAttrs)}>`;
  });
}

export function campaignStatusLabel(status: string | null | undefined): string {
  const value = status?.trim().toLowerCase() ?? "";
  if (value === "queued") {
    return "Queued";
  }
  if (value === "sending") {
    return "Sending";
  }
  if (value === "completed") {
    return "Completed";
  }
  if (value === "failed") {
    return "Failed";
  }
  if (value === "sent") {
    return "Sent";
  }
  if (value === "skipped") {
    return "Skipped";
  }
  return status?.trim() || "Unknown";
}

export function isCampaignInFlight(status: string | null | undefined): boolean {
  const value = status?.trim().toLowerCase() ?? "";
  return value === "queued" || value === "sending";
}

export function campaignResultSummary(counts: {
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  status?: string | null;
}): string {
  const countsText = `${counts.sentCount} sent, ${counts.failedCount} failed, ${counts.skippedCount} skipped`;
  if (isCampaignInFlight(counts.status)) {
    return `Delivery is still ${campaignStatusLabel(counts.status).toLowerCase()}. ${countsText}. This is not a completed send.`;
  }
  if ((counts.status ?? "").toLowerCase() === "failed") {
    return `Campaign failed. ${countsText}.`;
  }
  if (counts.failedCount > 0 || counts.skippedCount > 0) {
    return `Partial result: ${countsText}.`;
  }
  return `${countsText}.`;
}
