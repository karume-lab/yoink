import type { Platform } from "@/features/extractor/types";

export type DownloadStatus =
  | "queued"
  | "extracting"
  | "downloading"
  | "saving"
  | "complete"
  | "error";

export interface DownloadJob {
  id: string;
  platform: Platform;
  sourceUrl: string;
  author?: string;
  localUri?: string;
  status: DownloadStatus;
  progress: number; // 0 to 1
  error?: string;
}
