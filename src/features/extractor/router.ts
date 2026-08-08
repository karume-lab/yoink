import { extractInstagramPublic } from "@/features/extractor/instagram";
import { extractInstagramStory } from "@/features/extractor/instagram-story";
import { extractTikTok } from "@/features/extractor/tiktok";
import type { ExtractResult, Platform } from "@/features/extractor/types";

export async function resolveShortLink(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch (_error) {
    // If fetch fails (CORS, etc), fallback to original URL
    return url;
  }
}

export function detectPlatform(url: string): Platform | null {
  const lowercaseUrl = url.toLowerCase();

  if (
    lowercaseUrl.includes("tiktok.com") ||
    lowercaseUrl.includes("vm.tiktok.com") ||
    lowercaseUrl.includes("vt.tiktok.com")
  ) {
    return "tiktok";
  }

  if (lowercaseUrl.includes("instagram.com/stories/")) {
    return "instagram-story";
  }

  if (
    lowercaseUrl.includes("instagram.com/reel/") ||
    lowercaseUrl.includes("instagram.com/reels/")
  ) {
    return "instagram-reel";
  }

  if (lowercaseUrl.includes("instagram.com/p/")) {
    return "instagram-post";
  }

  return null;
}

export async function extractMedia(url: string): Promise<ExtractResult> {
  // Resolve short links like vm.tiktok.com -> tiktok.com/@user/video/123
  let finalUrl = url;
  if (url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
    finalUrl = await resolveShortLink(url);
  }

  const platform = detectPlatform(finalUrl);

  if (!platform) {
    throw new Error("Unsupported platform or invalid URL");
  }

  switch (platform) {
    case "tiktok":
      return await extractTikTok(finalUrl);
    case "instagram-post":
    case "instagram-reel":
      return await extractInstagramPublic(finalUrl, platform);
    case "instagram-story":
      return await extractInstagramStory(finalUrl);
    default:
      throw new Error(`Platform ${platform} extractor not implemented yet.`);
  }
}
