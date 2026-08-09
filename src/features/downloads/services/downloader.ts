import { File, Paths } from "expo-file-system";
import { requestPermissionsAsync } from "expo-media-library";
import {
  type SavedMedia,
  saveToYoinkAlbum,
} from "@/features/downloads/services/yoinkAlbum";
import type { Platform } from "@/features/extractor/types";
import { MOBILE_UA } from "@/lib/constants";
import { useDownloadStore } from "@/stores/downloadStore";

const PLATFORM_REFERERS: Record<Platform, string> = {
  tiktok: "https://www.tiktok.com/",
  "instagram-post": "https://www.instagram.com/",
  "instagram-reel": "https://www.instagram.com/",
  "instagram-story": "https://www.instagram.com/",
};

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await requestPermissionsAsync(true);
  return status === "granted";
}

export async function downloadAndSave(
  jobId: string,
  videoUrl: string,
  filename: string,
  platform: Platform,
  cookies?: string,
  onProgress?: (progress: number) => void,
): Promise<SavedMedia> {
  const store = useDownloadStore.getState();

  // 1. Download to local file system
  store.updateJob(jobId, { status: "downloading", progress: 0 });

  const file = new File(Paths.document, filename);

  const headers: Record<string, string> = {
    "User-Agent": MOBILE_UA,
    Referer: PLATFORM_REFERERS[platform],
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
  };
  if (cookies) headers.Cookie = cookies;

  try {
    // Non-2xx responses reject inside downloadFileAsync.
    const downloaded = await File.downloadFileAsync(videoUrl, file, {
      headers,
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        if (onProgress) onProgress(progress);
        store.updateJob(jobId, { progress });
      },
    });

    // 2. Validate the downloaded file is an actual video, not an error page
    if (!downloaded.exists || downloaded.size < 10_000) {
      throw new Error(
        "Downloaded file is too small to be a valid video. The link may have expired — try again.",
      );
    }

    // 3. Save to the Yoink album in the device gallery
    store.updateJob(jobId, { status: "saving", progress: 1 });

    const hasPermission = await ensureMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error(
        "Storage permission denied — enable it in Settings to save videos to your gallery",
      );
    }

    const saved = await saveToYoinkAlbum(downloaded.uri);

    // 4. The intermediate file is no longer needed once it's in the gallery
    try {
      downloaded.delete();
    } catch {
      // Already gone — nothing to clean up.
    }

    store.updateJob(jobId, {
      status: "complete",
      progress: 1,
      localUri: saved.localUri,
    });
    return saved;
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Unknown error during download";
    // downloadFileAsync rejects non-2xx responses with a message that embeds
    // the status code; surface it with the familiar wording instead.
    const statusMatch = rawMessage.match(/\b([1-5]\d{2})\b/);
    const errorMessage = statusMatch
      ? `Media server refused the download (status ${statusMatch[1]}). The link may have expired — try again.`
      : rawMessage;
    store.updateJob(jobId, { status: "error", error: errorMessage });
    throw error;
  }
}
