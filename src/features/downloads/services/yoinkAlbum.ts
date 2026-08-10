import * as MediaLibrary from "expo-media-library";
import { YOINK_ALBUM_NAME } from "@/lib/constants";

export interface SavedMedia {
  assetId: string;
  localUri: string;
}

export async function getYoinkAlbum(): Promise<MediaLibrary.Album | null> {
  try {
    return await MediaLibrary.Album.get(YOINK_ALBUM_NAME);
  } catch {
    return null;
  }
}

export async function saveToYoinkAlbum(filePath: string): Promise<SavedMedia> {
  const asset = await MediaLibrary.Asset.create(filePath);

  try {
    const album = await getYoinkAlbum();
    if (album) {
      await album.add(asset);
    } else {
      await MediaLibrary.Album.create(YOINK_ALBUM_NAME, [asset]);
    }
  } catch (error) {
    console.error("Failed to add asset to Yoink album:", error);
  }

  const localUri = await asset.getUri();
  return { assetId: asset.id, localUri };
}

/**
 * Removes assets from the Yoink album and the media store.
 *
 * Uses the modern expo-media-library Asset.delete API. On Android 11+
 * this launches the system's per-file "allow delete" confirmation dialog.
 * If the asset ID is a content URI, it is resolved to the numeric `_ID` first
 * so the Asset constructor can resolve it correctly.
 */
export async function deleteYoinkAssets(assetIds: string[]): Promise<void> {
  const valid = assetIds.filter((id) => id.length > 0);
  if (valid.length === 0) return;

  // Convert content URI to the numeric MediaStore `_ID` so MediaLibrary.Asset
  // can resolve it. Older native-share records stored the numeric id;
  // newer records store the full content URI.
  const numericIds = valid.map((id) => {
    if (id.startsWith("content://")) {
      const last = id.split("/").pop() ?? "";
      if (/^\d+$/.test(last)) return last;
    }
    return id;
  });

  // Delete one at a time so a stale id doesn't fail the whole batch.
  for (const id of numericIds) {
    try {
      await MediaLibrary.Asset.delete([new MediaLibrary.Asset(id)]);
    } catch (error) {
      console.warn(`Skipping asset ${id} (already deleted?):`, error);
    }
  }
}

export async function hasMediaLibraryPermission(): Promise<boolean> {
  const permission = await MediaLibrary.getPermissionsAsync(false);
  return permission.granted;
}
