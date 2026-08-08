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

  // TikTok escapes unicode in the page source (e.g. \u002F for "/"), so URLs
  // come back as "https:\u002F\u002F..." and never match a plain "https://".
  const decodeEscapes = (value: string) =>
    value
      .replace(/\\u[\dA-F]{4}/gi, (m) =>
        String.fromCharCode(parseInt(m.slice(2), 16)),
      )
      .replace(/\\n/g, "\n");

  try {
    // We bypass the fragile JSON structure entirely and use regex on the raw HTML

    // 1. Video URL (playAddr or downloadAddr)
    let videoUrl = "";
    const playAddrMatch = html.match(/"playAddr":"([^"]+)"/);
    const downloadAddrMatch = html.match(/"downloadAddr":"([^"]+)"/);
    if (playAddrMatch?.[1]) {
      videoUrl = decodeEscapes(playAddrMatch[1]);
    } else if (downloadAddrMatch?.[1]) {
      videoUrl = decodeEscapes(downloadAddrMatch[1]);
    } else {
      throw new Error("Could not find video URL in page source");
    }

    // 2. Cover image
    let coverUrl = "";
    const coverMatch = html.match(/"cover":"([^"]+)"/);
    if (coverMatch?.[1]) {
      coverUrl = decodeEscapes(coverMatch[1]);
    }

    // 3. Author username
    let author = "Unknown";
    const uniqueIdMatch = html.match(/"uniqueId":"([^"]+)"/);
    if (uniqueIdMatch?.[1]) {
      author = uniqueIdMatch[1];
    }

    // 4. Caption / description
    let caption = "";
    const descMatch = html.match(/"desc":"([^"]*)"/);
    if (descMatch?.[1]) {
      caption = decodeEscapes(descMatch[1]);
    }

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
