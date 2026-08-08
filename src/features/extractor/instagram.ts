import type { ExtractResult, Platform } from "@/features/extractor/types";
import { MOBILE_UA } from "@/lib/constants";

export async function extractInstagramPublic(
  url: string,
  platform: Platform,
): Promise<ExtractResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Instagram fetch failed with status: ${response.status}`);
  }

  const html = await response.text();

  // Try to find video URL in meta tags, with fallback to video_url in JSON blobs
  const videoUrlMatch =
    html.match(/<meta property="og:video" content="([^"]+)"/) ??
    html.match(/"video_url":\s*"([^"]+)"/);

  if (!videoUrlMatch?.[1]) {
    throw new Error(
      "Could not find video URL. Instagram may require authentication or page structure changed.",
    );
  }

  const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, "&");

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
