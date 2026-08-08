import * as SecureStore from "expo-secure-store";
import type { ExtractResult, Platform } from "@/features/extractor/types";
import { IG_SESSION_KEY, MOBILE_UA } from "@/lib/constants";

function extractVideoUrl(html: string): string | null {
  const match =
    html.match(/<meta property="og:video" content="([^"]+)"/) ??
    html.match(/"video_url":\s*"([^"]+)"/);
  return match?.[1]?.replace(/\\u0026/g, "&") ?? null;
}

export async function extractInstagramPublic(
  url: string,
  platform: Platform,
): Promise<ExtractResult> {
  const sessionId = await SecureStore.getItemAsync(IG_SESSION_KEY);

  const headers: Record<string, string> = {
    "User-Agent": MOBILE_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  if (sessionId) {
    headers.Cookie = `sessionid=${sessionId}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Instagram fetch failed with status: ${response.status}`);
  }

  const html = await response.text();

  let videoUrl = extractVideoUrl(html);

  // If unauthenticated fetch failed to get video URL, try to find it in the page data
  if (!videoUrl) {
    const dataMatch = html.match(
      /window\._sharedData\s*=\s*({.+?});\s*<\/script>/,
    );
    if (dataMatch?.[1]) {
      try {
        const data = JSON.parse(dataMatch[1]);
        const edgeMedia =
          data?.entry_data?.ProfilePage?.[0]?.graphql?.shortcode_media;
        videoUrl = edgeMedia?.video_url?.replace(/\\u0026/g, "&") ?? null;
      } catch {
        // JSON parse failed, continue
      }
    }
  }

  if (!videoUrl) {
    if (!sessionId) {
      throw new Error(
        "Instagram requires authentication. Please add your sessionid cookie in Settings.",
      );
    }
    throw new Error(
      "Could not find video URL. Your session cookie may be expired or page structure changed.",
    );
  }

  const coverUrlMatch = html.match(
    /<meta property="og:image" content="([^"]+)"/,
  );
  const coverUrl = coverUrlMatch?.[1].replace(/\\u0026/g, "&");

  const authorMatch = html.match(/"username":\s*"([^"]+)"/);
  const author = authorMatch?.[1];

  return {
    platform,
    videoUrl,
    coverUrl,
    author,
  };
}
