import * as MediaLibrary from "expo-media-library";
import * as LegacyMediaLibrary from "expo-media-library/legacy";
import { Platform } from "react-native";

export const YOINK_ALBUM_NAME = "Yoink";

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
 * On Android 11+ (API 30+) the legacy `deleteAssetsAsync` uses a raw
 * `contentResolver.delete()` call — no per-file confirm dialog — and only
 * deletes assets the app itself owns (i.e. assets it created).
 * On iOS the system always shows a confirmation dialog; this is acceptable.
 * If the asset ID is a content URI, it is resolved to the numeric `_ID` first.
 */
export async function deleteYoinkAssets(assetIds: string[]): Promise<void> {
  const valid = assetIds.map((id) => id).filter((id) => id.length > 0);
  if (valid.length === 0) return;

  // Convert content URI to the numeric MediaStore `_ID`.
  // Only older native-share records stored the numeric id; newer records
  // already stored the full content URI. Both formats work with the
  // legacy deleteAssetsAsync on Android.
  const numericIds = valid.map((id) => {
    if (id.startsWith("content://")) {
      const last = id.split("/").pop() ?? "";
      if (/^\d+$/.test(last)) return last;
    }
    return id;
  });

  if (Platform.OS === "android") {
    // Android 11+ (API 30+) — no per-file system confirm dialog.
    // Assets are deleted one at a time to avoid failing the whole batch.
    for (const id of numericIds) {
      try {
        await LegacyMediaLibrary.deleteAssetsAsync([id]);
      } catch (error) {
        console.warn(`Skipping asset ${id} (already deleted?):`, error);
      }
    }
    return;
  }

  // iOS always shows a confirmation dialog per batch, which is expected.
  // iOS also uses the asset ID that is the same format as the legacy
  // `deleteAssetsAsync` on this platform.
  for (const id of valid) {
    try {
      await LegacyMediaLibrary.deleteAssetsAsync([id]);
    } catch (error) {
      console.warn(`Skipping asset ${id} (already deleted?):`, error);
    }
  }
}

export async function hasMediaLibraryPermission(): Promise<boolean> {
  const permission = await MediaLibrary.getPermissionsAsync(false);
  return permission.granted;
}
