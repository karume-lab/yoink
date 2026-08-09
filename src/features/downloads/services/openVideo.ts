import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

const FLAG_GRANT_READ_URI_PERMISSION = 0x1;

export function resolveOpenableUri(
  localUri: string,
  assetId: string | null,
): string {
  if (assetId?.startsWith("content://")) return assetId;
  return localUri;
}

export async function openVideoFile(
  localUri: string,
  assetId: string | null,
): Promise<void> {
  const uri = resolveOpenableUri(localUri, assetId);

  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: uri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      });
      return;
    } catch (error) {
      console.warn("Intent launcher failed, falling back to Linking:", error);
    }
  }

  Linking.openURL(uri).catch(() => {});
}
