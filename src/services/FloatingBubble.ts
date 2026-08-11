import { NativeModules, Platform } from "react-native";

interface YoinkOverlayModule {
  startBubble(): void;
  stopBubble(): void;
  isBubbleActive(): Promise<boolean>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
}

const module = (NativeModules as { YoinkOverlay?: YoinkOverlayModule })
  .YoinkOverlay;

// The overlay module only exists in an Android build that ran the
// withFloatingBubble config plugin (never in Expo Go / iOS / web).
export const isFloatingBubbleSupported =
  Platform.OS === "android" && module != null;

export function startFloatingBubble(): void {
  module?.startBubble();
}

export function stopFloatingBubble(): void {
  module?.stopBubble();
}

export async function isBubbleActive(): Promise<boolean> {
  if (!module) return false;
  try {
    return await module.isBubbleActive();
  } catch {
    return false;
  }
}

export async function hasOverlayPermission(): Promise<boolean> {
  if (!module) return false;
  try {
    return await module.hasOverlayPermission();
  } catch {
    return false;
  }
}

// Opens the overlay permission screen and brings the user back to the app
// automatically once the permission is granted.
export function requestOverlayPermission(): void {
  module?.requestOverlayPermission();
}
