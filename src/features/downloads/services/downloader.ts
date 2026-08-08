import * as FileSystem from "expo-file-system/legacy";
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

  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const headers: Record<string, string> = {
    "User-Agent": MOBILE_UA,
    Referer: PLATFORM_REFERERS[platform],
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
  };
  if (cookies) headers.Cookie = cookies;

  const downloadResumable = FileSystem.createDownloadResumable(
    videoUrl,
    fileUri,
    { headers },
    (downloadProgress) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite;
      if (onProgress) onProgress(progress);
      store.updateJob(jobId, { progress });
    },
  );

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result?.uri) {
      throw new Error("Download failed to produce a valid URI");
    }

    // 2. Validate the downloaded file is an actual video, not an error page
    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Media server refused the download (status ${result.status}). The link may have expired — try again.`,
      );
    }

    if (result.mimeType?.startsWith("text/")) {
      throw new Error(
        "Media server returned an error page instead of a video. The link may have expired — try again.",
      );
    }

    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    if (!fileInfo.exists || fileInfo.size < 10_000) {
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

    const saved = await saveToYoinkAlbum(result.uri);

    // 4. The intermediate file is no longer needed once it's in the gallery
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(
      () => {},
    );

    store.updateJob(jobId, {
      status: "complete",
      progress: 1,
      localUri: saved.localUri,
    });
    return saved;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during download";
    store.updateJob(jobId, { status: "error", error: errorMessage });
    throw error;
  }
}
