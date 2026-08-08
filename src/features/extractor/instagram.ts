import type { ExtractResult, Platform } from "@/features/extractor/types";
import { MOBILE_UA } from "@/lib/constants";

const VIDEO_URL_PATTERN = /"video_url\\?":\s*\\?"(https:[^"]+)"/;
const DISPLAY_URL_PATTERN = /"display_url\\?":\s*\\?"(https:[^"]+)"/;
const USERNAME_PATTERN = /"username\\?":\s*\\?"([^"\\]+)/;

function unescapeInstagramUrl(value: string): string {
  return value
    .replace(/\\+$/, "")
    .replace(/\\\\\//g, "/")
    .replace(/\\\\/g, "\\")
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&");
}

function extractShortcode(url: string): string | null {
  return url.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

async function fetchInstagramPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": MOBILE_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function extractInstagramPublic(
  url: string,
  platform: Platform,
): Promise<ExtractResult> {
  const shortcode = extractShortcode(url);
  if (!shortcode) {
    throw new Error("Could not determine the Instagram post ID from that URL.");
  }

  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const html = await fetchInstagramPage(embedUrl);
  if (!html) {
    throw new Error(
      "Could not fetch the Instagram post. The post may be private or Instagram is blocking anonymous access.",
    );
  }

  const videoMatch = html.match(VIDEO_URL_PATTERN);
  if (!videoMatch?.[1]) {
    throw new Error(
      "Could not find video URL. The post may be private or Instagram is blocking anonymous access.",
    );
  }

  const coverUrlMatch = html.match(DISPLAY_URL_PATTERN);
  const authorMatch = html.match(USERNAME_PATTERN);

  return {
    platform,
    videoUrl: unescapeInstagramUrl(videoMatch[1]),
    coverUrl: coverUrlMatch
      ? unescapeInstagramUrl(coverUrlMatch[1])
      : undefined,
    author: authorMatch?.[1] ?? undefined,
  };
}
