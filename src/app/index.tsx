import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { configureNotifications } from "@/services/Notifications";
import { useOnboardingStore } from "@/stores/onboardingStore";

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useOnboardingStore(
    (state) => state.completeOnboarding,
  );
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);

  const requestPermission = async () => {
    setBusy(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false);
      if (permission.granted) {
        setPermissionGranted(true);
      } else {
        setPermissionDialogOpen(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const requestNotifications = async () => {
    const granted = await configureNotifications();
    if (granted) {
      setNotificationsGranted(true);
    }
  };

  const handleFinish = async () => {
    setBusy(true);
    try {
      // The "Yoink" album/folder is created on the first download. On Android,
      // MediaStore can't create an empty album via expo-media-library, so there
      // is nothing to set up here beyond the permission granted above.
      completeOnboarding();
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 py-8 justify-center">
      <Text variant="display" className="mb-3">
        Welcome to Yoink
      </Text>
      <Text variant="body" className="text-muted-foreground leading-snug mb-8">
        Download reels, posts, and stories. Videos are saved to a "Yoink" album
        in your gallery, so you can post them to your WhatsApp status or share
        them anywhere.
      </Text>

      <View className="gap-3 mb-8">
        <Text variant="title">Gallery access</Text>
        <Text variant="body" className="text-muted-foreground leading-snug">
          Allow gallery access so downloads are saved to the Yoink album and
          picked up by WhatsApp's media picker.
        </Text>
      </View>

      {!permissionGranted && (
        <Button variant="secondary" onPress={requestPermission} disabled={busy}>
          <Text>{busy ? "Requesting..." : "Allow gallery access"}</Text>
        </Button>
      )}

      {permissionGranted && !notificationsGranted && (
        <Button
          variant="secondary"
          onPress={requestNotifications}
          className="mt-3"
        >
          <Text>Allow download notifications</Text>
        </Button>
      )}

      <Button
        onPress={handleFinish}
        disabled={!permissionGranted || busy}
        className="mt-3"
      >
        <Text>Finish setup</Text>
      </Button>

      <Dialog
        open={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission needed</DialogTitle>
            <DialogDescription>
              Yoink needs gallery access to save your downloads so they appear
              in your gallery and WhatsApp status picker.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="default"
              onPress={() => setPermissionDialogOpen(false)}
            >
              <Text>OK</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
