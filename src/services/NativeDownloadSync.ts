import { File, Paths } from "expo-file-system";
import { db } from "@/db/client";
import { downloads } from "@/db/schema";
import type { Platform } from "@/features/extractor/types";
import { useDownloadStore } from "@/stores/downloadStore";

const NATIVE_DOWNLOADS_FILE = "native-downloads.json";

/**
 * A download that the native share service (ShareReceiverService) finished
 * while the JS runtime was not running. The service appends one of these to
 * `native-downloads.json` in the document directory after each successful
 * save to the gallery.
 */
export interface NativeDownloadRecord {
  id: string;
  platform: Platform;
  sourceUrl: string;
  author?: string;
  localUri: string;
  assetId?: string;
  fileSize?: number;
  createdAt: number;
}

/**
 * Imports downloads performed by the native share service into the JS app:
 * one History row and one completed Queue job per record. The records file is
 * removed once imported, so a launch that fails partway re-imports the rest —
 * the History insert is deduplicated on the record id, and Queue jobs are
 * simply overwritten.
 */
let reconcileInFlight: Promise<void> | null = null;

/**
 * Imports downloads performed by the native share service into the JS app:
 * one History row and one completed Queue job per record. The records file is
 * removed once imported, so a launch that fails partway re-imports the rest —
 * the History insert is deduplicated on the record id, and Queue jobs are
 * simply overwritten.
 */
export function reconcileNativeDownloads(): Promise<void> {
  if (!reconcileInFlight) {
    reconcileInFlight = doReconcile().finally(() => {
      reconcileInFlight = null;
    });
  }
  return reconcileInFlight;
}

async function doReconcile(): Promise<void> {
  const recordFile = new File(Paths.document, NATIVE_DOWNLOADS_FILE);
  if (!recordFile.exists) return;

  let records: NativeDownloadRecord[];
  try {
    records = JSON.parse(await recordFile.text());
  } catch (error) {
    console.warn("Discarding unreadable native downloads file:", error);
    try {
      recordFile.delete();
    } catch {
      // Nothing to clear — the file is gone next launch anyway.
    }
    return;
  }

  if (!Array.isArray(records) || records.length === 0) {
    try {
      recordFile.delete();
    } catch {
      // Same as above.
    }
    return;
  }

  const store = useDownloadStore.getState();

  for (const record of records) {
    if (!record?.id || !record?.sourceUrl || !record?.localUri) {
      continue;
    }

    try {
      // 1. Persist to download history, keyed on the native record id so a
      //    partial re-import never creates duplicates.
      await db
        .insert(downloads)
        .values({
          id: record.id,
          platform: record.platform,
          sourceUrl: record.sourceUrl,
          author: record.author,
          caption: null,
          coverUrl: null,
          localUri: record.localUri,
          assetId: record.assetId,
          fileSize: record.fileSize,
          createdAt: new Date(record.createdAt),
        })
        .onConflictDoNothing();

      // 2. Surface a completed job in the Queue tab.
      store.addJob({
        id: record.id,
        platform: record.platform,
        sourceUrl: record.sourceUrl,
        author: record.author,
        localUri: record.localUri,
        status: "complete",
        progress: 1,
      });
    } catch (error) {
      console.error("Failed to reconcile native download:", error);
    }
  }

  try {
    recordFile.delete();
  } catch {
    // Leave it for the next launch; imports are idempotent.
  }
}
