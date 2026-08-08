import * as SecureStore from "expo-secure-store";
import type { ExtractResult } from "@/features/extractor/types";
import { IG_SESSION_KEY, MOBILE_UA } from "@/lib/constants";

export async function extractInstagramStory(
  url: string,
): Promise<ExtractResult> {
  const sessionId = await SecureStore.getItemAsync(IG_SESSION_KEY);

  if (!sessionId) {
    throw new Error(
      "Instagram stories require a session cookie. Please add it in Settings.",
    );
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_UA,
      Cookie: `sessionid=${sessionId}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Instagram story fetch failed with status: ${response.status}`,
    );
  }

  const html = await response.text();

  // Similar parsing logic to public posts, but requires auth cookie for access
  const videoUrlMatch = html.match(/"video_url":\s*"([^"]+)"/);

  if (!videoUrlMatch?.[1]) {
    throw new Error(
      "Could not find video URL in story. Session cookie may be expired or invalid.",
    );
  }

  const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, "&");
  const author = html.match(/"username":\s*"([^"]+)"/)?.at(1);

  return {
    platform: "instagram-story",
    videoUrl,
    author,
  };
}
