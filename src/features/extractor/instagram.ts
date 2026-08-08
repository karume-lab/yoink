import * as SecureStore from "expo-secure-store";
import type { ExtractResult, Platform } from "@/features/extractor/types";
import { IG_SESSION_KEY, MOBILE_UA } from "@/lib/constants";

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

async function fetchInstagramPage(
  url: string,
  sessionId: string | null,
): Promise<string | null> {
  const headers: Record<string, string> = {
    "User-Agent": MOBILE_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };
  if (sessionId) {
    headers.Cookie = `sessionid=${sessionId}`;
  }

  try {
    const response = await fetch(url, { headers });
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

  const sessionId = await SecureStore.getItemAsync(IG_SESSION_KEY);
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

  // Try the public embed endpoint first (no session required), then fall back
  // to the original page with the session cookie.
  const attempts = [
    { target: embedUrl, withAuth: false },
    { target: embedUrl, withAuth: true },
    { target: url, withAuth: true },
  ];

  for (const attempt of attempts) {
    if (attempt.withAuth && !sessionId) continue;

    const html = await fetchInstagramPage(
      attempt.target,
      attempt.withAuth ? sessionId : null,
    );
    if (!html) continue;

    const videoMatch = html.match(VIDEO_URL_PATTERN);
    if (!videoMatch?.[1]) continue;

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

  throw new Error(
    sessionId
      ? "Could not find video URL. Your session cookie may be expired or the page structure changed."
      : "Could not find video URL. The post may be private or Instagram is blocking anonymous access — try adding your sessionid cookie in Settings.",
  );
}
