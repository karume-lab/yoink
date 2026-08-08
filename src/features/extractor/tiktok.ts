import type { ExtractResult } from "@/features/extractor/types";
import { MOBILE_UA } from "@/lib/constants";

export async function extractTikTok(url: string): Promise<ExtractResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`TikTok fetch failed with status: ${response.status}`);
  }

  const html = await response.text();

  // Try to find the __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([^<]+)<\/script>/,
  );

  if (!match?.[1]) {
    throw new Error(
      "Could not find __UNIVERSAL_DATA_FOR_REHYDRATION__ tag. TikTok page structure may have changed.",
    );
  }

  try {
    const data = JSON.parse(match[1]);

    // The exact JSON path varies and TikTok changes it occasionally.
    // Currently, video data is usually inside:
    // data["__DEFAULT_SCOPE__"]["webapp.video-detail"]["itemInfo"]["itemStruct"]

    const defaultScope = data.__DEFAULT_SCOPE__;
    if (!defaultScope) throw new Error("Missing __DEFAULT_SCOPE__ in JSON");

    const videoDetail = defaultScope["webapp.video-detail"];
    if (!videoDetail) throw new Error("Missing webapp.video-detail in JSON");

    const itemStruct = videoDetail.itemInfo?.itemStruct;
    if (!itemStruct) throw new Error("Missing itemStruct in JSON");

    // We want the watermark-free video url, typically playAddr or downloadAddr
    const videoUrl =
      itemStruct.video?.playAddr || itemStruct.video?.downloadAddr;
    if (!videoUrl) throw new Error("Missing video URL in itemStruct.video");

    const coverUrl = itemStruct.video?.cover || itemStruct.video?.originCover;
    const author = itemStruct.author?.uniqueId || itemStruct.author?.nickname;
    const caption = itemStruct.desc;

    return {
      platform: "tiktok",
      videoUrl,
      coverUrl,
      author,
      caption,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse TikTok data: ${error.message}`);
    }
    throw new Error("Failed to parse TikTok data (unknown error)");
  }
}
