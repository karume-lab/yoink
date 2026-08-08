import { desc, eq, like, lt, or } from "drizzle-orm";
import { nanoid } from "nanoid/non-secure";
import { db } from "@/db/client";
import { downloads } from "@/db/schema";
import type { ExtractResult } from "@/features/extractor/types";

export async function insertDownload(
  data: ExtractResult & {
    localUri: string;
    assetId?: string;
    fileSize?: number;
  },
) {
  await db.insert(downloads).values({
    id: nanoid(),
    platform: data.platform,
    sourceUrl: data.videoUrl, // Original video URL from extraction
    author: data.author,
    caption: data.caption,
    coverUrl: data.coverUrl,
    localUri: data.localUri,
    assetId: data.assetId,
    fileSize: data.fileSize,
    createdAt: new Date(),
  });
}

export async function getAllDownloads() {
  return await db.select().from(downloads).orderBy(desc(downloads.createdAt));
}

export async function searchDownloads(query: string) {
  const searchTerm = `%${query}%`;
  return await db
    .select()
    .from(downloads)
    .where(
      or(
        like(downloads.author, searchTerm),
        like(downloads.caption, searchTerm),
        like(downloads.platform, searchTerm),
      ),
    )
    .orderBy(desc(downloads.createdAt));
}

export async function deleteDownload(id: string) {
  await db.delete(downloads).where(eq(downloads.id, id));
}

export async function deleteDownloads(ids: string[]) {
  if (ids.length === 0) return;
  await db
    .delete(downloads)
    .where(or(...ids.map((id) => eq(downloads.id, id))));
}

export async function getDownloadsOlderThan(cutoff: Date) {
  return await db
    .select()
    .from(downloads)
    .where(lt(downloads.createdAt, cutoff));
}
