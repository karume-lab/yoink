import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { deleteYoinkAssets } from "@/features/downloads/services/yoinkAlbum";
import {
  deleteDownloads,
  getDownloadsOlderThan,
} from "@/features/history/services/queries";
import { useDownloadStore } from "@/stores/downloadStore";

const YOINK_CLEANUP_TASK = "YOINK_CLEANUP";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function runExpiredDownloadsCleanup(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const expired = await getDownloadsOlderThan(cutoff);
    if (expired.length === 0) return;

    const assetIds = expired
      .map((row) => row.assetId)
      .filter((id): id is string => !!id);
    const localUris = new Set(expired.map((row) => row.localUri));
    const ids = expired.map((row) => row.id);

    // Remove the videos from the device gallery.
    await deleteYoinkAssets(assetIds);

    // Drop the DB history rows for purged downloads.
    await deleteDownloads(ids);

    // Drop any matching completed jobs from the download store.
    const store = useDownloadStore.getState();
    for (const job of Object.values(store.jobs)) {
      if (job.localUri && localUris.has(job.localUri)) {
        store.removeJob(job.id);
      }
    }
  } catch (error) {
    console.error("Expired downloads cleanup failed:", error);
  }
}

TaskManager.defineTask(YOINK_CLEANUP_TASK, async () => {
  try {
    await runExpiredDownloadsCleanup();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background cleanup task failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Runs on launch / foreground so old files get purged even when the OS
// doesn't fire the background task on schedule.
export const runStartupCleanup = async () => {
  await runExpiredDownloadsCleanup();
};

export const registerBackgroundTasks = async () => {
  try {
    const alreadyRegistered =
      await TaskManager.isTaskRegisteredAsync(YOINK_CLEANUP_TASK);
    if (alreadyRegistered) {
      return;
    }
    await BackgroundTask.registerTaskAsync(YOINK_CLEANUP_TASK, {
      minimumInterval: 15, // minutes; the OS may run it less often
    });
  } catch (err) {
    console.log("Background task registration failed:", err);
  }
};
