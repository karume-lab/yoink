import { nanoid } from "nanoid/non-secure";
import { downloadAndSave } from "@/features/downloads/services/downloader";
import type { DownloadJob } from "@/features/downloads/types";
import { extractMedia } from "@/features/extractor/router";
import { insertDownload } from "@/features/history/services/queries";
import {
  showDownloadComplete,
  showDownloadFailed,
} from "@/services/Notifications";
import { useDownloadStore } from "@/stores/downloadStore";

function jobLabel(job: DownloadJob): string {
  if (job.author) return `${job.author} (${job.platform})`;
  return "Your video";
}

let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const store = useDownloadStore.getState();
    const jobs = Object.values(store.jobs);

    // Find the next queued job
    const nextJob = jobs.find((j) => j.status === "queued");

    if (!nextJob) {
      isProcessing = false;
      return;
    }

    try {
      store.updateJob(nextJob.id, { status: "extracting", progress: 0 });

      const extracted = await extractMedia(nextJob.sourceUrl);

      store.updateJob(nextJob.id, {
        platform: extracted.platform,
        author: extracted.author,
      });

      const timestamp = Date.now();
      const safeAuthor =
        extracted.author?.replace(/[^a-z0-9]/gi, "_") || "unknown";
      const filename = `${extracted.platform}-${safeAuthor}-${timestamp}.mp4`;

      const saved = await downloadAndSave(
        nextJob.id,
        extracted.videoUrl,
        filename,
        extracted.platform,
        extracted.cookies,
      );

      if (nextJob.notify) {
        void showDownloadComplete(
          nextJob.id,
          jobLabel({ ...nextJob, ...extracted }),
        );
      }

      // Persist to download history so it shows up in the History tab.
      try {
        await insertDownload({
          platform: extracted.platform,
          videoUrl: extracted.videoUrl,
          author: extracted.author,
          caption: extracted.caption,
          coverUrl: extracted.coverUrl,
          localUri: saved.localUri,
          assetId: saved.assetId,
        });
      } catch (error) {
        console.error("Failed to persist download to history:", error);
      }

      // The download is safely in the gallery and in history, so drop it from
      // the queue - the Queue tab only tracks in-flight/failed work.
      store.removeJob(nextJob.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      store.updateJob(nextJob.id, { status: "error", error: errorMessage });
      if (nextJob.notify) {
        void showDownloadFailed(nextJob.id, errorMessage);
      }
    }

    isProcessing = false;
    // Recursively process the next item
    processQueue();
  } catch (_e) {
    isProcessing = false;
  }
}

export function enqueueDownload(url: string, options?: { notify?: boolean }) {
  const id = nanoid();

  const job: DownloadJob = {
    id,
    platform: "tiktok", // Will be detected properly during extraction, default to something
    sourceUrl: url,
    status: "queued",
    progress: 0,
    notify: options?.notify,
  };

  useDownloadStore.getState().addJob(job);

  // Kick off processing
  processQueue();

  return id;
}
