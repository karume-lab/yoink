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

  try {
    // We bypass the fragile JSON structure entirely and use regex on the raw HTML

    // 1. Video URL (playAddr or downloadAddr)
    let videoUrl = "";
    const playAddrMatch = html.match(/"playAddr":"(https?:\/\/[^"]+)"/);
    const downloadAddrMatch = html.match(/"downloadAddr":"(https?:\/\/[^"]+)"/);
    if (playAddrMatch?.[1]) {
      videoUrl = playAddrMatch[1].replace(/\\u002F/g, "/");
    } else if (downloadAddrMatch?.[1]) {
      videoUrl = downloadAddrMatch[1].replace(/\\u002F/g, "/");
    } else {
      throw new Error("Could not find video URL in page source");
    }

    // 2. Cover image
    let coverUrl = "";
    const coverMatch = html.match(/"cover":"(https?:\/\/[^"]+)"/);
    if (coverMatch?.[1]) {
      coverUrl = coverMatch[1].replace(/\\u002F/g, "/");
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
      // Decode unicode escapes
      caption = descMatch[1]
        .replace(/\\u[\dA-F]{4}/gi, (m) =>
          String.fromCharCode(parseInt(m.replace(/\\u/g, ""), 16)),
        )
        .replace(/\\n/g, "\n");
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
