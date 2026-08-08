import * as MediaLibrary from "expo-media-library";

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

export async function deleteYoinkAssets(assetIds: string[]): Promise<void> {
  const valid = assetIds.filter((id) => id.length > 0);
  if (valid.length === 0) return;

  // Delete one at a time so a stale id (already removed from the gallery, or
  // one that no longer resolves on Android) doesn't fail the whole batch.
  for (const id of valid) {
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
