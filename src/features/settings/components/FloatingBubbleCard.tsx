import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { IconFloatRight } from "tabler-icons-react-native";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  hasOverlayPermission,
  isBubbleActive,
  isFloatingBubbleSupported,
  openOverlayPermissionSettings,
  startFloatingBubble,
  stopFloatingBubble,
} from "@/services/FloatingBubble";

export const FloatingBubbleCard: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      const [active, granted] = await Promise.all([
        isBubbleActive(),
        hasOverlayPermission(),
      ]);
      setEnabled(active);
      setPermissionGranted(granted);
    };
    void refresh();

    // The overlay permission is granted in Android's Settings, so re-check
    // whenever the user returns to the app.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, []);

  if (!isFloatingBubbleSupported) return null;

  const handleToggle = async (value: boolean) => {
    if (value) {
      const granted = await hasOverlayPermission();
      if (!granted) {
        setPermissionGranted(false);
        openOverlayPermissionSettings();
        return;
      }
      setPermissionGranted(true);
      startFloatingBubble();
      setEnabled(true);
    } else {
      stopFloatingBubble();
      setEnabled(false);
    }
  };

  return (
    <View className="bg-card border border-border/50 rounded-md p-5 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-md bg-white/5">
            <Icon as={IconFloatRight} className="text-primary" size={20} />
          </View>
          <Text className="text-base font-semibold text-foreground">
            Floating bubble
          </Text>
        </View>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </View>
      <Text className="mt-3 text-sm leading-5 text-muted-foreground">
        Shows a bubble over TikTok and other apps. Copy a link inside TikTok,
        then tap the bubble to download it without leaving the app.
      </Text>
      {!permissionGranted && (
        <Text className="mt-3 text-xs leading-5 text-muted-foreground">
          Approve the “Display over other apps” permission when prompted, then
          toggle this on again.
        </Text>
      )}
    </View>
  );
};
