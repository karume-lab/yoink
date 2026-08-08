import * as FileSystem from "expo-file-system/legacy";
import { useDownloadStore } from "@/stores/downloadStore";

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

    store.updateJob(jobId, {
      status: "complete",
      progress: 1,
      localUri: result.uri,
    });
    return result.uri;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during download";
    store.updateJob(jobId, { status: "error", error: errorMessage });
    throw error;
  }
}
