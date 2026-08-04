export type VideoEmbedSource = "youtube" | "vimeo";

export type VideoEmbedInfo = {
  source: VideoEmbedSource;
  videoId: string;
  videoUrl: string;
  embedUrl: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;
const VIMEO_ID_PATTERN = /^[0-9]+$/;

function readQueryParam(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function parseYouTube(url: URL): VideoEmbedInfo | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.slice("/embed/".length).split("/")[0] ?? null;
    } else if (url.pathname === "/watch") {
      videoId = readQueryParam(url, "v");
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.slice("/shorts/".length).split("/")[0] ?? null;
    }
  }

  if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
    return null;
  }

  return {
    source: "youtube",
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
  };
}

function parseVimeo(url: URL): VideoEmbedInfo | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "vimeo.com") {
    const segment = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (segment && VIMEO_ID_PATTERN.test(segment)) {
      videoId = segment;
    }
  } else if (host === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
    videoId = url.pathname.slice("/video/".length).split("/")[0] ?? null;
  }

  if (!videoId || !VIMEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  return {
    source: "vimeo",
    videoId,
    videoUrl: `https://vimeo.com/${videoId}`,
    embedUrl: `https://player.vimeo.com/video/${videoId}`,
  };
}

export function parseVideoEmbedUrl(input: string): VideoEmbedInfo | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    return parseYouTube(url);
  }

  if (VIMEO_HOSTS.has(host)) {
    return parseVimeo(url);
  }

  return null;
}

export function readVideoEmbedFromSectionProps(
  props: Record<string, unknown>,
): VideoEmbedInfo | null {
  if (typeof props.videoUrl === "string") {
    return parseVideoEmbedUrl(props.videoUrl);
  }

  return null;
}
