import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";
import { useDownloadStore } from "@/stores/downloadStore";
import { useSettingsStore } from "@/stores/settingsStore";

export async function downloadAndSave(
  jobId: string,
  videoUrl: string,
  filename: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const store = useDownloadStore.getState();

  // 1. Download to local file system
  store.updateJob(jobId, { status: "downloading", progress: 0 });

  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    videoUrl,
    fileUri,
    {},
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

    // 2. Save to Media Library (Camera Roll)
    store.updateJob(jobId, { status: "saving", progress: 1 });

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Media library permission not granted");
    }

    const asset = await MediaLibrary.createAssetAsync(result.uri);

    const settings = useSettingsStore.getState();
    if (settings.saveToAlbum) {
      const albumName = settings.albumName || "Kaza";
      const album = await MediaLibrary.getAlbumAsync(albumName);

      if (album == null) {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    }

    // Clean up temporary file if on iOS to avoid duplicating storage
    // (Android MediaLibrary.createAssetAsync moves the file or keeps it, but on iOS we can safely delete)
    if (Platform.OS === "ios") {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    }

    store.updateJob(jobId, {
      status: "complete",
      progress: 1,
      localUri: asset.uri,
    });
    return asset.uri;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during download";
    store.updateJob(jobId, { status: "error", error: errorMessage });
    throw error;
  }
}
